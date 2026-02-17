import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Desktop } from './components/desktop/Desktop'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { VisitorPage } from './pages/VisitorPage'
import { LoadingOverlay, AlertDialog } from './components/ui'
import { useAuthStore } from './stores/authStore'
import { useAlertStore } from './stores/alertStore'
import { isApiConfigured } from './services/api'

/**
 * Global Alert Manager
 * Renders AlertDialog based on alertStore state
 */
function GlobalAlert() {
  const { alert, closeAlert } = useAlertStore()

  if (!alert) return null

  // Build button handlers based on alert type
  const handleClose = () => {
    closeAlert()
    alert.onCancel?.()
  }

  const handleConfirm = () => {
    closeAlert()
    alert.onConfirm?.()
  }

  // Generate buttons based on alert type
  const buttons =
    alert.type === 'confirm'
      ? [
          { label: 'Cancel', onClick: handleClose },
          { label: 'OK', onClick: handleConfirm, primary: true },
        ]
      : [{ label: 'OK', onClick: handleClose, primary: true }]

  return (
    <AlertDialog
      type={alert.type}
      title={alert.title}
      message={alert.message}
      buttons={buttons}
      onClose={handleClose}
    />
  )
}

// Protected route wrapper for authenticated pages
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return <LoadingOverlay message="Initializing..." />
  }

  // If API is not configured, allow access to desktop (demo mode)
  if (!isApiConfigured) {
    return <>{children}</>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { initialize, initialized } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    return () => unsubscribe()
  }, [initialize])

  // Show loading screen while auth initializes
  if (!initialized && isApiConfigured) {
    return <LoadingOverlay message="Starting EternalOS..." />
  }

  return (
    <>
      {/* Global Alert Dialog */}
      <GlobalAlert />

      <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/@:username" element={<VisitorPage />} />

      {/* Protected routes */}
      <Route
        path="/desktop"
        element={
          <ProtectedRoute>
            <Desktop />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
