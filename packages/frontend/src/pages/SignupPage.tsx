// Signup Page - Classic Mac OS styled registration
import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { isApiConfigured } from '../services/api'
import styles from './AuthPage.module.css'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const { signup, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  // Set document title
  useEffect(() => {
    document.title = 'Create Your Desktop | EternalOS'
    return () => { document.title = 'EternalOS' }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)

    if (!isApiConfigured) {
      // Demo mode - just navigate to desktop
      navigate('/desktop')
      return
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters')
      return
    }

    await signup(email, password, username)
    // If signup successful, auth state change will trigger navigation
  }

  const displayError = localError || error

  // If API not configured, show demo mode notice
  if (!isApiConfigured) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authWindow}>
          <div className={styles.titleBar}>
            <span className={styles.titleText}>Sign Up</span>
          </div>
          <div className={styles.content}>
            <div className={styles.logo}>
              <span className={styles.logoText}>EternalOS</span>
            </div>

            <div className={styles.mockModeNotice}>
              API not configured. Running in demo mode.
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <button type="submit" className={styles.submitButton}>
                Enter Demo Mode
              </button>
            </form>

            <div className={styles.linkSection}>
              <span>Already have an account? </span>
              <Link to="/login" className={styles.link}>Log In</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authWindow}>
        <div className={styles.titleBar}>
          <span className={styles.titleText}>Sign Up</span>
        </div>
        <div className={styles.content}>
          <div className={styles.logo}>
            <span className={styles.logoText}>EternalOS</span>
          </div>

          {displayError && <div className={styles.error}>{displayError}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="your-unique-username"
                required
                autoComplete="username"
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={20}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className={styles.linkSection}>
            <span>Already have an account? </span>
            <Link to="/login" className={styles.link}>Log In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
