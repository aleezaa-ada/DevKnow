import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import QuestionListPage from './pages/QuestionListPage'
import QuestionDetailPage from './pages/QuestionDetailPage'
import AskQuestionPage from './pages/AskQuestionPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import ReviewDetailPage from './pages/ReviewDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<QuestionListPage />} />
        <Route path="/questions/:id" element={<QuestionDetailPage />} />
        <Route path="/ask" element={<AskQuestionPage />} />
        <Route path="/review" element={<ReviewQueuePage />} />
        <Route path="/review/:id" element={<ReviewDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
