// Global Cypress support file.

Cypress.Commands.add('acceptTermsIfPresent', () => {
	cy.get('body').then(($body) => {
		const hasTermsModal = $body.find('[role="dialog"][aria-labelledby="terms-title"]').length > 0
		if (!hasTermsModal) return

		cy.contains('label', 'I have read and agree to these terms').click()
		cy.contains('button', 'Continue to DevKnow').click()
		cy.get('[role="dialog"]').should('not.exist')
	})
})
