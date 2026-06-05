describe('Retry AI flow', () => {
  const questionId = 5001
  const username = 'e2e_retry_user'
  const userId = 10

  // Set auth state directly in localStorage — avoids the login → feed redirect
  // race condition that would trigger a real backend 401 and clear auth.
  function seedAuth() {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-access-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
      win.localStorage.setItem('user', JSON.stringify({ id: userId, username, role: 'standard' }))
    })
  }

  function stubFailedQuestion() {
    cy.intercept('GET', `**/api/questions/${questionId}/`, {
      statusCode: 200,
      body: {
        id: questionId,
        title: 'Why is my Django query slow?',
        description: 'I have an N+1 problem somewhere.',
        author: { id: userId, username, role: 'standard' },
        status: 'open',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_response: null,
        approved_answer: null,
      },
    }).as('questionDetail')
  }

  it('shows failure notice when AI response is null, retries, and shows new AI draft', () => {
    stubFailedQuestion()
    cy.visit(`/questions/${questionId}`)
    seedAuth()
    cy.reload()
    cy.wait('@questionDetail')

    // Failure notice and retry button are visible
    cy.contains('AI response could not be generated').should('be.visible')
    cy.contains('button', /retry/i).should('be.visible')

    // Stub retry endpoint — succeeds
    cy.intercept('POST', `**/api/questions/${questionId}/retry*`, {
      statusCode: 200,
      body: { status: 'success', ai_response_id: 8001 },
    }).as('retryAi')

    // After retry, re-fetch returns question with a new AI draft
    cy.intercept('GET', `**/api/questions/${questionId}/`, {
      statusCode: 200,
      body: {
        id: questionId,
        title: 'Why is my Django query slow?',
        description: 'I have an N+1 problem somewhere.',
        author: { id: 10, username, role: 'standard' },
        status: 'pending',
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_response: {
          id: 8001,
          content: 'Use `select_related` and `prefetch_related` to resolve N+1 issues.',
          model_used: 'claude-sonnet-4-20250514',
          approval_status: 'pending',
          generated_at: new Date().toISOString(),
        },
        approved_answer: null,
      },
    }).as('questionDetailAfterRetry')

    cy.contains('button', /retry/i).click()
    cy.wait('@retryAi')
    cy.wait('@questionDetailAfterRetry')

    // AI draft is now shown; failure notice is gone
    cy.contains('AI Draft Response').should('be.visible')
    cy.contains('AI response could not be generated').should('not.exist')
  })

  it('shows an error message when the retry API call fails', () => {
    stubFailedQuestion()

    cy.intercept('POST', `**/api/questions/${questionId}/retry*`, {
      statusCode: 500,
      body: { error: 'AI generation failed: API key invalid.' },
    }).as('retryFail')

    cy.visit(`/questions/${questionId}`)
    seedAuth()
    cy.reload()
    cy.wait('@questionDetail')

    cy.contains('button', /retry/i).click()
    cy.wait('@retryFail')

    cy.get('[role="alert"]').should('contain.text', 'AI generation failed')
    // Failure notice is still shown
    cy.contains('AI response could not be generated').should('be.visible')
  })
})
