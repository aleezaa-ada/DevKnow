describe('Review access control flow', () => {
  it('redirects standard users away from review page', () => {
    const username = 'e2e_standard_access_user'
    const password = 'pass12345'

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 33, username, role: 'standard' },
    }).as('me')

    cy.intercept('GET', '**/api/questions/**', {
      statusCode: 200,
      body: { count: 0, next: null, previous: null, results: [] },
    }).as('feed')

    cy.visit('/login')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@feed')

    cy.visit('/review')

    cy.url().should('match', /http:\/\/localhost:5173\/$/)
    cy.get('[role="alert"]').should('contain.text', "You don't have permission to access that page.")
  })
})
