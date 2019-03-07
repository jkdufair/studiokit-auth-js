import { Action } from 'redux'
import AUTH_ACTION from './actions'

export interface OAuthToken {
	access_token: string
	refresh_token: string
	token_type: string
	expires_in: number
	client_id: string
	'.issued': string
	'.expires': string
}

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
