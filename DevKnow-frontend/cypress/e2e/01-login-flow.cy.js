describe('Login flow', () => {
  it('logs in a standard user and lands on Questions feed', () => {
    const username = 'e2e_standard_user'
    const password = 'pass12345'

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 1, username, role: 'standard' },
    }).as('me')

    cy.intercept('GET', '**/api/questions/**', {
      statusCode: 200,
      body: { count: 0, next: null, previous: null, results: [] },
    }).as('questions')

    cy.visit('/login')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@questions')

    cy.contains('h1', 'Questions').should('be.visible')
    cy.url().should('include', '/')
  })
})
