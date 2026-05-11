import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeedPage from './pages/FeedPage'
import QuestionDetailPage from './pages/QuestionDetailPage'
import AskQuestionPage from './pages/AskQuestionPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import ReviewDetailPage from './pages/ReviewDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetailPage /></ProtectedRoute>} />
        <Route path="/ask" element={<ProtectedRoute><AskQuestionPage /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute allowedRoles={['senior', 'admin']}><ReviewQueuePage /></ProtectedRoute>} />
        <Route path="/review/:id" element={<ProtectedRoute allowedRoles={['senior', 'admin']}><ReviewDetailPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
