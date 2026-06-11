describe('Feed pagination flow', () => {
  it('moves between page 1 and page 2 from the questions list controls', () => {
    const username = 'e2e_pagination_user'
    const password = 'pass12345'

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 44, username, role: 'standard' },
    }).as('me')

    cy.intercept('GET', '**/api/questions/**', (req) => {
      const page = Number(req.query.page || 1)

      if (page === 1) {
        req.reply({
          statusCode: 200,
          body: {
            count: 2,
            next: 'http://localhost:8000/api/questions/?page=2',
            previous: null,
            results: [
              {
                id: 101,
                title: 'Page 1 Question',
                author: { id: 1, username: 'alice' },
                status: 'open',
                tags: [],
                created_at: new Date().toISOString(),
              },
            ],
          },
        })
        return
      }

      req.reply({
        statusCode: 200,
        body: {
          count: 2,
          next: null,
          previous: 'http://localhost:8000/api/questions/?page=1',
          results: [
            {
              id: 102,
              title: 'Page 2 Question',
              author: { id: 2, username: 'bob' },
              status: 'answered',
              tags: [{ id: 2, name: 'auth' }],
              created_at: new Date().toISOString(),
            },
          ],
        },
      })
    }).as('questions')

    cy.visit('/login')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@questions')
    cy.acceptTermsIfPresent()

    cy.contains('Page 1 Question').should('be.visible')
    cy.contains('Page 2 Question').should('not.exist')
    cy.contains('span', 'Page 1').should('be.visible')

    cy.contains('button', 'Next').click()
    cy.wait('@questions')

    cy.url().should('include', '?page=2')
    cy.contains('Page 2 Question').should('be.visible')
    cy.contains('span', 'Page 2').should('be.visible')

    cy.contains('button', 'Previous').click()
    cy.wait('@questions')

    cy.url().should('not.include', '?page=2')
    cy.contains('Page 1 Question').should('be.visible')
  })
})
