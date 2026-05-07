import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LogoutButton from '../components/LogoutButton'

export default function QuestionListPage() {
  const { state } = useLocation()

  // Clear the router state after first render so a page reload won't re-show the message
  useEffect(() => {
    if (state?.authError) {
      window.history.replaceState({}, '')
    }
  }, [state?.authError])

  return (
    <main>
      <LogoutButton />
      {state?.authError && (
        <p role="alert" style={{ color: 'red' }}>{state.authError}</p>
      )}
      <h1>Questions</h1>
      <p>Browse and search all questions.</p>
    </main>
  )
}
