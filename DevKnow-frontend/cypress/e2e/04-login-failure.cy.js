describe('Login failure flow', () => {
  it('shows an error message for invalid credentials', () => {
    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 401,
      body: { detail: 'No active account found with the given credentials' },
    }).as('loginFail')

    cy.visit('/login')
    cy.get('#username').type('wrong-user')
    cy.get('#password').type('wrong-pass')
    cy.contains('button', 'Sign in').click()

    cy.wait('@loginFail')
    cy.get('[role="alert"]').should('contain.text', 'Invalid username or password.')
    cy.url().should('include', '/login')
  })
})
