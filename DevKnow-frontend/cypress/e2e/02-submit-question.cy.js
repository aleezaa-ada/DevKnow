describe('Submit question flow', () => {
  it('logs in and submits a new question from Ask page', () => {
    const username = 'e2e_ask_user'
    const password = 'pass12345'
    const title = `E2E Question ${Date.now()}`
    const createdId = 999001

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 1, username, role: 'standard' },
    }).as('me')

    cy.intercept('GET', '**/api/questions/?page=1*', {
      statusCode: 200,
      body: { count: 0, next: null, previous: null, results: [] },
    }).as('feed')

    // Keep test deterministic and independent from external AI latency.
    cy.intercept('POST', '**/api/questions/', {
      statusCode: 201,
      body: { id: createdId, title },
    }).as('createQuestion')

    cy.intercept('GET', `**/api/questions/${createdId}/`, {
      statusCode: 200,
      body: {
        id: createdId,
        title,
        description: 'This is an E2E submitted description for validating question creation flow.',
        author: { id: 1, username },
        status: 'open',
        tags: [{ id: 1, name: 'e2e' }, { id: 2, name: 'testing' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ai_response: null,
        approved_answer: null,
      },
    }).as('questionDetail')

    cy.visit('/login')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@feed')

    cy.contains('a', 'Ask a Question').click()
    cy.contains('h1', 'Ask a Question').should('be.visible')

    cy.get('#title').type(title)
    cy.get('#description').type('This is an E2E submitted description for validating question creation flow.')
    cy.get('#tags').type('e2e,testing')

    cy.contains('button', 'Submit question').click()
    cy.wait('@createQuestion')
    cy.wait('@questionDetail')
    cy.url().should('include', '/questions/')
    cy.contains(title).should('be.visible')
  })
})
