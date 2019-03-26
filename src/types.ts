import { Action } from 'redux'
import { OAuthToken, OAuthTokenResponse } from 'studiokit-net-js'
import { AUTH_ACTION } from './actions'

export interface AuthAction extends Action<AUTH_ACTION> {
	oauthToken?: OAuthToken
}

export interface AuthState {
	isAuthenticated: boolean
	isAuthenticating: boolean
	isInitialized: boolean
	didFail: boolean
}

export interface ClientCredentials {
	client_id: string
	client_secret: string
}

export interface Credentials {
	Username: string
	Password: string
}

export interface TokenPersistenceService {
	getPersistedToken: () => OAuthTokenResponse | Promise<OAuthTokenResponse>
	persistToken: (oauthToken: OAuthTokenResponse) => void
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
