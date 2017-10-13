// @flow

import type { TokenPersistenceService, TicketProviderService, CodeProviderService } from './types'

let storedToken

const tokenPersistenceService: TokenPersistenceService = {
	getPersistedToken: () => {
		return storedToken
	},

	persistToken: token => {
		storedToken = token
	}
}

const ticketProviderService: TicketProviderService = {
	getTicket: () => null,
	getAppServiceName: () => null,
	removeTicket: () => {}
}

const codeProviderService: CodeProviderService = {
	getCode: () => null,
	removeCode: () => {}
}

export { tokenPersistenceService, ticketProviderService, codeProviderService }
