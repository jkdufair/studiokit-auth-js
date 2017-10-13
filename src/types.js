// @flow

export type OAuthToken = {
	access_token: string,
	refresh_token: string,
	token_type: string,
	expires_in: number,
	client_id: string,
	'.issued': string,
	'.expires': string
}

export type ClientCredentials = {
	client_id: string,
	client_secret: string
}

export type Credentials = {
	Username: string,
	Password: string
}

export type LoggerFunction = string => void

export type TokenPersistenceService = {
	getPersistedToken: void => OAuthToken,
	persistToken: OAuthToken => void
}

export type TicketProviderService = {
	getTicket: void => ?string,
	getAppServiceName: void => ?string,
	removeTicket: void => void
}

export type CodeProviderService = {
	getCode: void => ?string,
	removeCode: void => void
}
