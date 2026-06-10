describe('Register flow', () => {
  it('does not expose role selection and shows senior onboarding guidance', () => {
    cy.visit('/register')

    cy.get('#role').should('not.exist')
    cy.contains('Senior developers: use your pre-approved email to receive senior access automatically.').should('be.visible')
  })

  it('successfully registers and is redirected to login with success message', () => {
    cy.intercept('POST', '**/api/auth/register/**', (req) => {
      expect(req.body).to.include({
        username: 'new_e2e_user',
        email: 'new_e2e_user@example.com',
        password: 'securepass1',
        password2: 'securepass1',
      })
      expect(req.body).to.not.have.property('role')

      req.reply({
        statusCode: 201,
        body: { message: 'User created successfully', user: { username: 'new_e2e_user', role: 'standard' } },
      })
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
