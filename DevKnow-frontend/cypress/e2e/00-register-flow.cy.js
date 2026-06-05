describe('Register flow', () => {
  it('successfully registers and is redirected to login with success message', () => {
    cy.intercept('POST', '**/api/auth/register/**', {
      statusCode: 201,
      body: { message: 'User created successfully', user: { username: 'new_e2e_user' } },
    }).as('register')

    cy.visit('/register')
    cy.contains('h2', 'Create an account').should('be.visible')

    cy.get('#username').type('new_e2e_user')
    cy.get('#email').type('new_e2e_user@example.com')
    cy.get('#password').type('securepass1')
    cy.get('#password2').type('securepass1')

    cy.contains('button', 'Create account').click()
    cy.wait('@register')

    cy.url().should('include', '/login')
    cy.get('[role="status"]').should('contain.text', 'Account created! Please sign in.')
  })

  it('shows a field error when username is already taken', () => {
    cy.intercept('POST', '**/api/auth/register/**', {
      statusCode: 400,
      body: { username: ['A user with this username already exists.'] },
    }).as('registerFail')

    cy.visit('/register')

    cy.get('#username').type('taken_user')
    cy.get('#email').type('taken@example.com')
    cy.get('#password').type('securepass1')
    cy.get('#password2').type('securepass1')

    cy.contains('button', 'Create account').click()
    cy.wait('@registerFail')

    cy.url().should('include', '/register')
    cy.get('[role="alert"]').should('contain.text', 'A user with this username already exists.')
  })
})
