// Login Page - Classic Mac OS styled authentication
import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { isApiConfigured } from '../services/api'
import styles from './AuthPage.module.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error, clearError, user } = useAuthStore()
  const navigate = useNavigate()

  // Set document title
  useEffect(() => {
    document.title = 'Log In | EternalOS'
    return () => { document.title = 'EternalOS' }
  }, [])

  // If already logged in, redirect to desktop
  useEffect(() => {
    if (user) {
      navigate('/desktop', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()

    if (!isApiConfigured) {
      // Demo mode - navigate to demo user's desktop
      navigate('/@demo', { replace: true })
      return
    }

    try {
      await login(email, password)
      // Navigation happens via useEffect when user state updates
    } catch (err) {
      // Error is handled by the store
      console.error('Login error:', err)
    }
  }

  // If API not configured, show demo mode notice
  if (!isApiConfigured) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authWindow}>
          <div className={styles.titleBar}>
            <span className={styles.titleText}>Log In</span>
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
              <span>No account? </span>
              <Link to="/signup" className={styles.link}>Sign Up</Link>
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
          <span className={styles.titleText}>Log In</span>
        </div>
        <div className={styles.content}>
          <div className={styles.logo}>
            <span className={styles.logoText}>EternalOS</span>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
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
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className={styles.linkSection}>
            <span>No account? </span>
            <Link to="/signup" className={styles.link}>Sign Up</Link>
          </div>

          <div className={styles.linkSection}>
            <Link to="/forgot-password" className={styles.link}>Forgot Password?</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
