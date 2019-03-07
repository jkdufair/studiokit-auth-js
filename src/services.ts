import { TokenPersistenceService, TicketProviderService, CodeProviderService } from './types'
import { OAuthToken } from 'studiokit-net-js/lib/types'

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
