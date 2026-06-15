describe('Review and approve flow', () => {
  it('senior user approves a pending question from review queue', () => {
    const standardUsername = 'e2e_std_review_user'
    const seniorUsername = 'e2e_senior_review_user'
    const password = 'pass12345'
    const reviewTitle = `E2E Review Target ${Date.now()}`

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 2, username: seniorUsername, role: 'senior' },
    }).as('me')

    const mockQuestion = {
      id: 7001,
      title: reviewTitle,
      description: 'Pending question created for review approval E2E flow.',
      author: { id: 21, username: standardUsername, role: 'standard' },
      status: 'pending',
      tags: [{ id: 1, name: 'e2e' }, { id: 2, name: 'review' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_response: {
        id: 9001,
        content: 'Mocked AI draft response for approval flow.',
        model_used: 'claude-sonnet-4-20250514',
        approval_status: 'pending',
        generated_at: new Date().toISOString(),
      },
      approved_answer: null,
    }

    cy.intercept('GET', '**/api/questions/review/**', {
      statusCode: 200,
      body: [mockQuestion],
    }).as('getReviewQueue')

    cy.intercept('POST', '**/api/questions/9001/review/**', {
      statusCode: 200,
      body: { status: 'ok', action: 'approved' },
    }).as('approveReview')

    cy.visit('/login')
    cy.get('#username').type(seniorUsername)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.acceptTermsIfPresent()

    cy.url().should('include', '/review')
    cy.wait('@getReviewQueue')
    cy.contains('h1', 'Review Queue').should('be.visible')
    cy.contains(reviewTitle).should('be.visible')
    cy.acceptTermsIfPresent()

    cy.contains('button', /expand/i).first().click()
    cy.contains('button', 'Submit decision').click()
    cy.wait('@approveReview')

    cy.contains(reviewTitle).should('not.exist')
  })
})
