/**
 * Auth Routes
 *
 * POST /api/auth/signup - Create account
 * POST /api/auth/login  - Authenticate
 * POST /api/auth/logout - Invalidate session
 */

import type { Env } from '../index';
import type { UserRecord, SessionRecord } from '../types';
import { signJWT } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

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

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase();

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

  // Generate JWT
  const token = await signJWT({ uid, username: normalizedUsername }, env.JWT_SECRET);

  // Store session in KV (optional, for session management)
  const sessionExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
  const sessionRecord: SessionRecord = {
    uid,
    expiresAt: now + (sessionExpiry * 1000),
  };
  await env.AUTH_KV.put(`session:${token}`, JSON.stringify(sessionRecord), {
    expirationTtl: sessionExpiry,
  });

  return Response.json({
    token,
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

  const normalizedEmail = email.toLowerCase().trim();

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

  // Store session in KV
  const now = Date.now();
  const sessionExpiry = 7 * 24 * 60 * 60; // 7 days
  const sessionRecord: SessionRecord = {
    uid: userRecord.uid,
    expiresAt: now + (sessionExpiry * 1000),
  };
  await env.AUTH_KV.put(`session:${token}`, JSON.stringify(sessionRecord), {
    expirationTtl: sessionExpiry,
  });

  return Response.json({
    token,
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

  // Delete session from KV
  await env.AUTH_KV.delete(`session:${token}`);

  return Response.json({ success: true });
}
