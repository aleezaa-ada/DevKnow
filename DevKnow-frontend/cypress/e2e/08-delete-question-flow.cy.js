describe('Delete question flow', () => {
  const questionId = 6001
  const username = 'e2e_delete_user'
  const userId = 20

  function seedAuth() {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-access-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
      win.localStorage.setItem('user', JSON.stringify({ id: userId, username, role: 'standard' }))
      win.localStorage.setItem(`devknow_terms_accepted_${userId}`, '1')
    })
  }

  beforeEach(() => {
    cy.intercept('GET', `**/api/questions/${questionId}/`, {
      statusCode: 200,
      body: {
        id: questionId,
        title: 'How does async/await work in Python?',
        description: 'I want to understand the event loop better.',
        // author id matches the logged-in user so delete button is shown
        author: { id: userId, username, role: 'standard' },
        status: 'open',
        tags: [{ id: 1, name: 'python' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_response: null,
        approved_answer: null,
      },
    }).as('questionDetail')

    cy.visit(`/questions/${questionId}`)
    seedAuth()
    cy.reload()
    cy.wait('@questionDetail')
  })

  it('deletes the question and redirects to the feed when user confirms', () => {
    cy.intercept('DELETE', `**/api/questions/${questionId}/**`, {
      statusCode: 204,
      body: null,
    }).as('deleteQuestion')

    // Intercept only the feed list load that happens after redirect.
    // Regex avoids accidentally matching detail endpoints like /api/questions/6001/
    cy.intercept('GET', /\/api\/questions\/?(\?.*)?$/, {
      statusCode: 200,
      body: { count: 0, next: null, previous: null, results: [] },
    }).as('feed')

    // Cypress stubs window.confirm to return true (user clicks OK)
    cy.on('window:confirm', () => true)

    cy.contains('button', 'Delete question').should('be.visible').click()
    cy.wait('@deleteQuestion')

    cy.url().should('eq', Cypress.config('baseUrl') + '/')
    cy.contains('h1', 'Questions').should('be.visible')
  })

  it('stays on the question page when user cancels the confirm dialog', () => {
    cy.intercept('DELETE', `**/api/questions/${questionId}/**`, {
      statusCode: 204,
      body: null,
    }).as('deleteQuestion')

    // Cypress stubs window.confirm to return false (user clicks Cancel)
    cy.on('window:confirm', () => false)

    cy.contains('button', 'Delete question').click()

    // No DELETE request should have been made
    cy.get('@deleteQuestion.all').then((interceptions) => {
      expect(interceptions).to.have.length(0)
    })

    cy.url().should('include', `/questions/${questionId}`)
    cy.contains('h1', /How does async\/await work/).should('be.visible')
  })

  it('shows an error and stays on the page when the DELETE request fails', () => {
    cy.intercept('DELETE', `**/api/questions/${questionId}/**`, {
      statusCode: 403,
      body: { detail: 'You do not have permission to perform this action.' },
    }).as('deleteFail')

    cy.on('window:confirm', () => true)

    cy.contains('button', 'Delete question').click()
    cy.wait('@deleteFail')

    cy.get('[role="alert"]').should('be.visible')
    cy.url().should('include', `/questions/${questionId}`)
  })
})
