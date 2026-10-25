// Loaded before every e2e spec: global hooks and custom commands go here.

declare global {
  namespace Cypress {
    interface Chainable {
      /** Selects elements by their `data-cy` test hook. */
      getByCy(value: string): Chainable<JQuery<HTMLElement>>
    }
  }
}

Cypress.Commands.add('getByCy', (value: string) => cy.get(`[data-cy="${value}"]`))

export {}
