import { OAuthToken } from 'studiokit-net-js'
import { CodeProviderService, TicketProviderService, TokenPersistenceService } from './types'

let storedToken: OAuthToken | null

const tokenPersistenceService: TokenPersistenceService = {
	getPersistedToken: () => {
		return storedToken
	},

	persistToken: token => {
		storedToken = token
	}
}

const ticketProviderService: TicketProviderService = {
	getTicket: () => undefined,
	getAppServiceName: () => undefined,
	removeTicket: () => {
		// no op
	}
}

const codeProviderService: CodeProviderService = {
	getCode: () => undefined,
	removeCode: () => {
		// no op
	}
}

export { tokenPersistenceService, ticketProviderService, codeProviderService }
