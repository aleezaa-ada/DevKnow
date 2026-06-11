describe('Negative critical flows', () => {
  it('shows an error and stays on Ask page when question submission fails', () => {
    const username = 'e2e_negative_ask_user'
    const password = 'pass12345'
    const title = `E2E Negative Question ${Date.now()}`

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

    // Simulate a network-level failure so frontend shows generic submit error.
    cy.intercept('POST', '**/api/questions/', {
      forceNetworkError: true,
    }).as('createQuestionFail')

    cy.visit('/login')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@feed')
    cy.acceptTermsIfPresent()

    cy.contains('a', 'Ask a Question').click()
    cy.contains('h1', 'Ask a Question').should('be.visible')

    cy.get('#title').type(title)
    cy.get('#description').type('This should fail and keep me on Ask page.')
    cy.get('#tags').type('e2e,negative')

    cy.contains('button', 'Submit question').click()
    cy.wait('@createQuestionFail')

    cy.url().should('include', '/ask')
    cy.get('[role="alert"]').should('contain.text', 'Something went wrong. Please try again.')
    cy.contains('button', 'Submit question').should('be.visible').and('not.be.disabled')
  })

  it('shows inline error and keeps item in queue when senior review submission fails', () => {
    const seniorUsername = 'e2e_negative_senior'
    const password = 'pass12345'

    const pendingQuestion = {
      id: 8101,
      title: `E2E Negative Review ${Date.now()}`,
      description: 'Pending question for failed review submission path.',
      author: { id: 77, username: 'standard_user', role: 'standard' },
      status: 'pending',
      tags: [{ id: 1, name: 'e2e' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_response: {
        id: 9101,
        content: 'Draft AI content pending senior review.',
        model_used: 'gpt-4o',
        approval_status: 'pending',
        generated_at: new Date().toISOString(),
      },
      approved_answer: null,
    }

    cy.intercept('POST', '**/api/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-access-token', refresh: 'fake-refresh-token' },
    }).as('login')

    cy.intercept('GET', '**/api/auth/me/**', {
      statusCode: 200,
      body: { id: 2, username: seniorUsername, role: 'senior' },
    }).as('me')

    cy.intercept('GET', '**/api/questions/review/**', {
      statusCode: 200,
      body: [pendingQuestion],
    }).as('reviewQueue')

    cy.intercept('POST', '**/api/questions/9101/review/**', {
      statusCode: 500,
      body: {},
    }).as('reviewFail')

    cy.visit('/login')
    cy.get('#username').type(seniorUsername)
    cy.get('#password').type(password)
    cy.contains('button', 'Sign in').click()

    cy.wait('@login')
    cy.wait('@me')
    cy.wait('@reviewQueue')
    cy.acceptTermsIfPresent()

    cy.url().should('include', '/review')
    cy.contains(pendingQuestion.title).should('be.visible')

    cy.contains('button', /expand/i).first().click()
    cy.contains('button', 'Submit decision').click()

    cy.wait('@reviewFail')
    cy.get('[role="alert"]').should('contain.text', 'Submission failed. Please try again.')
    cy.contains(pendingQuestion.title).should('be.visible')
  })
})
