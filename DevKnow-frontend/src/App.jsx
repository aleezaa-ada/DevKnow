import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import TermsModal from './components/TermsModal'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeedPage from './pages/FeedPage'
import QuestionDetailPage from './pages/QuestionDetailPage'
import AskQuestionPage from './pages/AskQuestionPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import ReviewDetailPage from './pages/ReviewDetailPage'
import SearchResultsPage from './pages/SearchResultsPage'
import NotFoundPage from './pages/NotFoundPage'

function termsKey(userId) {
  return `devknow_terms_accepted_${userId}`
}

export default function App() {
  const { user } = useAuth()
  const [acceptedUsers, setAcceptedUsers] = useState(new Set())

  const showTerms = Boolean(
    user
      && !localStorage.getItem(termsKey(user.id))
      && !acceptedUsers.has(user.id),
  )

  function handleAcceptTerms() {
    localStorage.setItem(termsKey(user.id), '1')
    setAcceptedUsers((prev) => {
      const next = new Set(prev)
      next.add(user.id)
      return next
    })
  }

  return (
    <BrowserRouter>
      {showTerms && <TermsModal onAccept={handleAcceptTerms} />}
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetailPage /></ProtectedRoute>} />
        <Route path="/ask" element={<ProtectedRoute><AskQuestionPage /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute allowedRoles={['senior', 'admin']}><ReviewQueuePage /></ProtectedRoute>} />
        <Route path="/review/:id" element={<ProtectedRoute allowedRoles={['senior', 'admin']}><ReviewDetailPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchResultsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
