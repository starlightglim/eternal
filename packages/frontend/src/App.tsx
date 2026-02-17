import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Desktop } from './components/desktop/Desktop'
import { MobileBrowser } from './components/desktop/MobileBrowser'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { VisitorPage } from './pages/VisitorPage'
import { LoadingOverlay, AlertDialog } from './components/ui'
import { useAuthStore } from './stores/authStore'
import { useAlertStore } from './stores/alertStore'
import { useIsMobile } from './hooks/useIsMobile'
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

// Responsive wrapper - shows MobileBrowser on small screens
function ResponsiveDesktop() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileBrowser /> : <Desktop />
}

// Smart route that shows owner Desktop or visitor view based on auth
function UserDesktopRoute() {
  const { user, initialized } = useAuthStore()
  const isMobile = useIsMobile()
  const username = window.location.pathname.slice(2) // Remove "/@"

  if (!initialized && isApiConfigured) {
    return <LoadingOverlay message="Loading..." />
  }

  // If logged in as this user, show owner's Desktop (responsive)
  if (user?.username?.toLowerCase() === username.toLowerCase()) {
    return isMobile ? <MobileBrowser /> : <Desktop />
  }

  // Otherwise show visitor view (has its own mobile handling)
  return <VisitorPage />
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
      <Route path="/@:username" element={<UserDesktopRoute />} />

      {/* Protected routes */}
      <Route
        path="/desktop"
        element={
          <ProtectedRoute>
            <ResponsiveDesktop />
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
