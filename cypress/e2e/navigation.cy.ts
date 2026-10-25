describe('Navigation', () => {
  beforeEach(() => {
    // Cypress clears localStorage between tests, so each one starts with a fresh progress.
    cy.visit('/')
  })

  it('opens the dashboard and goes to the practice tab', () => {
    cy.getByCy('page-title').should('have.text', 'Tableau de bord')
    cy.getByCy('nav-home').should('have.attr', 'aria-current', 'page')

    cy.getByCy('nav-practice').click()

    cy.location('pathname').should('eq', '/practice')
    cy.getByCy('page-title').should('have.text', 'Entraînement libre')
    cy.title().should('eq', 'Entraînement libre · Flash Cards QA')
    cy.getByCy('nav-practice').should('have.attr', 'aria-current', 'page')
    cy.getByCy('nav-home').should('not.have.attr', 'aria-current')
  })
})
