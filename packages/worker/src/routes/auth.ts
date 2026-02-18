/**
 * Auth Routes
 *
 * POST /api/auth/signup           - Create account
 * POST /api/auth/login            - Authenticate
 * POST /api/auth/logout           - Invalidate session
 * POST /api/auth/forgot-password  - Request password reset
 * POST /api/auth/reset-password   - Reset password with token
 */

import type { Env } from '../index';
import type { UserRecord, SessionRecord, PasswordResetRecord } from '../types';
import { signJWT } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { sanitizeEmail, sanitizeUsername } from '../utils/sanitize';

interface SignupBody {
  email: string;
  password: string;
  username: string;
}

interface LoginBody {
  email: string;
  password: string;
}

// Validation helpers
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or less';
  }
  return null;
}

function validateUsername(username: string): string | null {
  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  if (username.length > 20) {
    return 'Username must be 20 characters or less';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  // Reserved usernames
  const reserved = ['admin', 'api', 'www', 'mail', 'root', 'help', 'support'];
  if (reserved.includes(username.toLowerCase())) {
    return 'This username is reserved';
  }
  return null;
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
export async function handleSignup(request: Request, env: Env): Promise<Response> {
  let body: SignupBody;
  try {
    body = await request.json() as SignupBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password, username } = body;

  // Validate inputs
  if (!email || !password || !username) {
    return Response.json({ error: 'Email, password, and username are required' }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 400 });
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return Response.json({ error: usernameError }, { status: 400 });
  }

  const normalizedEmail = sanitizeEmail(email);
  const normalizedUsername = sanitizeUsername(username);

  // Check if email already exists
  const existingUser = await env.AUTH_KV.get(`user:${normalizedEmail}`);
  if (existingUser) {
    return Response.json({ error: 'Email already registered' }, { status: 409 });
  }

  // Check if username is taken
  const existingUsername = await env.AUTH_KV.get(`username:${normalizedUsername}`);
  if (existingUsername) {
    return Response.json({ error: 'Username already taken' }, { status: 409 });
  }

  // Generate user ID and hash password
  const uid = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = Date.now();

  // Create user record
  const userRecord: UserRecord = {
    uid,
    email: normalizedEmail,
    passwordHash,
    username: normalizedUsername,
    createdAt: now,
  };

  // Store user data in KV (atomically as possible)
  await env.AUTH_KV.put(`user:${normalizedEmail}`, JSON.stringify(userRecord));
  await env.AUTH_KV.put(`username:${normalizedUsername}`, JSON.stringify({ uid }));
  // UID -> email index for session validation after password change
  await env.AUTH_KV.put(`uid:${uid}`, JSON.stringify({ email: normalizedEmail }));

  // Track this user for scheduled jobs (trash cleanup, etc.)
  // We use a simple list stored in KV, appending the new UID
  const existingUsers = await env.AUTH_KV.get('all_users');
  const userList = existingUsers ? JSON.parse(existingUsers) as string[] : [];
  if (!userList.includes(uid)) {
    userList.push(uid);
    await env.AUTH_KV.put('all_users', JSON.stringify(userList));
  }

  // Initialize user's Durable Object with profile
  const doId = env.USER_DESKTOP.idFromName(uid);
  const stub = env.USER_DESKTOP.get(doId);
  await stub.fetch(new Request('http://internal/profile', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      username: normalizedUsername,
      displayName: username, // Preserve original case for display
      wallpaper: 'default',
      createdAt: now,
    }),
  }));

  // Generate JWT and refresh token
  const token = await signJWT({ uid, username: normalizedUsername }, env.JWT_SECRET);
  const refreshToken = crypto.randomUUID() + '-' + crypto.randomUUID();

  // Access token: 15 minutes, Refresh token: 7 days
  const accessExpiry = 15 * 60; // 15 minutes in seconds
  const refreshExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

  // Store session in KV
  const sessionRecord: SessionRecord = {
    uid,
    expiresAt: now + (accessExpiry * 1000),
    issuedAt: now,
    refreshToken,
    refreshExpiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`session:${token}`, JSON.stringify(sessionRecord), {
    expirationTtl: accessExpiry,
  });

  // Store refresh token
  const refreshData = {
    uid,
    username: normalizedUsername,
    accessToken: token,
    expiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`refresh:${refreshToken}`, JSON.stringify(refreshData), {
    expirationTtl: refreshExpiry,
  });

  return Response.json({
    token,
    refreshToken,
    expiresIn: accessExpiry,
    user: {
      uid,
      username: normalizedUsername,
      email: normalizedEmail,
    },
  });
}

/**
 * POST /api/auth/login
 * Authenticate existing user
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: LoginBody;
  try {
    body = await request.json() as LoginBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;

  // Validate inputs
  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const normalizedEmail = sanitizeEmail(email);

  // Look up user
  const userJson = await env.AUTH_KV.get(`user:${normalizedEmail}`);
  if (!userJson) {
    // Use generic message to prevent user enumeration
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const userRecord = JSON.parse(userJson) as UserRecord;

  // Verify password
  const valid = await verifyPassword(password, userRecord.passwordHash);
  if (!valid) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  // Generate new JWT
  const token = await signJWT(
    { uid: userRecord.uid, username: userRecord.username },
    env.JWT_SECRET
  );

  // Generate refresh token
  const now = Date.now();
  const refreshToken = crypto.randomUUID() + '-' + crypto.randomUUID();

  // Access token: 15 minutes, Refresh token: 7 days
  const accessExpiry = 15 * 60; // 15 minutes in seconds
  const refreshExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

  // Store session in KV
  const sessionRecord: SessionRecord = {
    uid: userRecord.uid,
    expiresAt: now + (accessExpiry * 1000),
    issuedAt: now,
    refreshToken,
    refreshExpiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`session:${token}`, JSON.stringify(sessionRecord), {
    expirationTtl: accessExpiry,
  });

  // Store refresh token
  const refreshData = {
    uid: userRecord.uid,
    username: userRecord.username,
    accessToken: token,
    expiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`refresh:${refreshToken}`, JSON.stringify(refreshData), {
    expirationTtl: refreshExpiry,
  });

  return Response.json({
    token,
    refreshToken,
    expiresIn: accessExpiry,
    user: {
      uid: userRecord.uid,
      username: userRecord.username,
      email: normalizedEmail,
    },
  });
}

/**
 * POST /api/auth/logout
 * Invalidate session
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'No token provided' }, { status: 400 });
  }

  const token = authHeader.slice('Bearer '.length);

  // Get session to also delete refresh token
  const sessionJson = await env.AUTH_KV.get(`session:${token}`);
  if (sessionJson) {
    const session = JSON.parse(sessionJson) as SessionRecord;
    if (session.refreshToken) {
      await env.AUTH_KV.delete(`refresh:${session.refreshToken}`);
    }
  }

  // Delete session from KV
  await env.AUTH_KV.delete(`session:${token}`);

  return Response.json({ success: true });
}

/**
 * Generate a secure refresh token
 */
function generateRefreshToken(): string {
  return crypto.randomUUID() + '-' + crypto.randomUUID();
}

interface RefreshTokenBody {
  refreshToken: string;
}

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token (token rotation)
 */
export async function handleRefreshToken(request: Request, env: Env): Promise<Response> {
  let body: RefreshTokenBody;
  try {
    body = await request.json() as RefreshTokenBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { refreshToken } = body;

  if (!refreshToken) {
    return Response.json({ error: 'Refresh token is required' }, { status: 400 });
  }

  // Look up refresh token
  const refreshJson = await env.AUTH_KV.get(`refresh:${refreshToken}`);
  if (!refreshJson) {
    return Response.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
  }

  const refreshData = JSON.parse(refreshJson) as {
    uid: string;
    username: string;
    accessToken: string;
    expiresAt: number;
  };

  // Check if refresh token has expired
  if (Date.now() > refreshData.expiresAt) {
    await env.AUTH_KV.delete(`refresh:${refreshToken}`);
    return Response.json({ error: 'Refresh token has expired' }, { status: 401 });
  }

  // Check if password was changed after refresh token was issued
  const uidIndexJson = await env.AUTH_KV.get(`uid:${refreshData.uid}`);
  if (uidIndexJson) {
    const { email } = JSON.parse(uidIndexJson) as { email: string };
    const userJson = await env.AUTH_KV.get(`user:${email}`);
    if (userJson) {
      const user = JSON.parse(userJson) as UserRecord;
      // Get the old session to check its issuedAt
      const oldSessionJson = await env.AUTH_KV.get(`session:${refreshData.accessToken}`);
      if (oldSessionJson) {
        const oldSession = JSON.parse(oldSessionJson) as SessionRecord;
        if (user.passwordChangedAt && oldSession.issuedAt < user.passwordChangedAt) {
          // Password was changed - invalidate refresh token
          await env.AUTH_KV.delete(`refresh:${refreshToken}`);
          await env.AUTH_KV.delete(`session:${refreshData.accessToken}`);
          return Response.json({ error: 'Session invalidated due to password change' }, { status: 401 });
        }
      }
    }
  }

  // Delete old refresh token (one-time use for rotation)
  await env.AUTH_KV.delete(`refresh:${refreshToken}`);
  // Delete old access token session
  await env.AUTH_KV.delete(`session:${refreshData.accessToken}`);

  // Generate new tokens
  const now = Date.now();
  const newAccessToken = await signJWT({ uid: refreshData.uid, username: refreshData.username }, env.JWT_SECRET);
  const newRefreshToken = generateRefreshToken();

  // Access token: 15 minutes, Refresh token: 7 days
  const accessExpiry = 15 * 60; // 15 minutes in seconds
  const refreshExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

  // Store new session
  const sessionRecord: SessionRecord = {
    uid: refreshData.uid,
    expiresAt: now + (accessExpiry * 1000),
    issuedAt: now,
    refreshToken: newRefreshToken,
    refreshExpiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`session:${newAccessToken}`, JSON.stringify(sessionRecord), {
    expirationTtl: accessExpiry,
  });

  // Store new refresh token
  const newRefreshData = {
    uid: refreshData.uid,
    username: refreshData.username,
    accessToken: newAccessToken,
    expiresAt: now + (refreshExpiry * 1000),
  };
  await env.AUTH_KV.put(`refresh:${newRefreshToken}`, JSON.stringify(newRefreshData), {
    expirationTtl: refreshExpiry,
  });

  return Response.json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: accessExpiry,
  });
}

interface ForgotPasswordBody {
  email: string;
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 */
export async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  let body: ForgotPasswordBody;
  try {
    body = await request.json() as ForgotPasswordBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email } = body;

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }

  const normalizedEmail = sanitizeEmail(email);

  // Look up user by email
  const userJson = await env.AUTH_KV.get(`user:${normalizedEmail}`);

  // Always return success to prevent email enumeration attacks
  // Even if user doesn't exist, we return the same response
  if (!userJson) {
    return Response.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been generated.',
    });
  }

  const userRecord = JSON.parse(userJson) as UserRecord;

  // Generate a secure reset token
  const resetToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const now = Date.now();
  const ttlSeconds = 60 * 60; // 1 hour TTL

  const resetRecord: PasswordResetRecord = {
    uid: userRecord.uid,
    email: normalizedEmail,
    createdAt: now,
    expiresAt: now + (ttlSeconds * 1000),
  };

  // Store reset token in KV with TTL
  await env.AUTH_KV.put(`reset:${resetToken}`, JSON.stringify(resetRecord), {
    expirationTtl: ttlSeconds,
  });

  // In production, you would send this via email using an email service
  // For now, we return the token in the response (for development/demo purposes)
  // In production, remove the resetToken from the response and send via email
  return Response.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been generated.',
    // Development only - remove in production!
    resetToken,
    resetUrl: `/reset-password?token=${resetToken}`,
  });
}

interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token
 */
export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  let body: ResetPasswordBody;
  try {
    body = await request.json() as ResetPasswordBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, newPassword } = body;

  if (!token) {
    return Response.json({ error: 'Reset token is required' }, { status: 400 });
  }

  if (!newPassword) {
    return Response.json({ error: 'New password is required' }, { status: 400 });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 400 });
  }

  // Look up the reset token
  const resetJson = await env.AUTH_KV.get(`reset:${token}`);
  if (!resetJson) {
    return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
  }

  const resetRecord = JSON.parse(resetJson) as PasswordResetRecord;

  // Check if token has expired (double-check since KV TTL handles this too)
  if (Date.now() > resetRecord.expiresAt) {
    await env.AUTH_KV.delete(`reset:${token}`);
    return Response.json({ error: 'Reset token has expired' }, { status: 400 });
  }

  // Get the user record
  const userJson = await env.AUTH_KV.get(`user:${resetRecord.email}`);
  if (!userJson) {
    // User was deleted after reset was requested
    await env.AUTH_KV.delete(`reset:${token}`);
    return Response.json({ error: 'Account no longer exists' }, { status: 400 });
  }

  const userRecord = JSON.parse(userJson) as UserRecord;

  // Hash the new password
  const newPasswordHash = await hashPassword(newPassword);
  const now = Date.now();

  // Update the user record with new password and passwordChangedAt timestamp
  // This invalidates all existing sessions since they were issued before this timestamp
  const updatedUserRecord: UserRecord = {
    ...userRecord,
    passwordHash: newPasswordHash,
    passwordChangedAt: now,
  };

  await env.AUTH_KV.put(`user:${resetRecord.email}`, JSON.stringify(updatedUserRecord));

  // Delete the reset token (one-time use)
  await env.AUTH_KV.delete(`reset:${token}`);

  // All existing sessions are now invalid because their issuedAt < passwordChangedAt
  // The auth middleware will check this condition and reject old sessions

  return Response.json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.',
  });
}
