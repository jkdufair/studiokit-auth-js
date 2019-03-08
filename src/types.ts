import { Action } from 'redux'
import { OAuthToken } from 'studiokit-net-js'
import { AUTH_ACTION } from './actions'

export interface AuthAction extends Action<AUTH_ACTION> {
	oauthToken?: OAuthToken
}

export interface ClientCredentials {
	client_id: string
	client_secret: string
}

export interface Credentials {
	Username: string
	Password: string
}

export type LoggerFunction = (message: string) => void

export interface TokenPersistenceService {
	getPersistedToken(): OAuthToken | null
	persistToken(oauthToken: OAuthToken | null): void
}

export interface TicketProviderService {
	getTicket(): string | undefined
	getAppServiceName(): string | undefined
	removeTicket(): void
}

export interface CodeProviderService {
	getCode(): string | undefined
	removeCode(): void
}
