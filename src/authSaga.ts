import { SagaIterator } from '@redux-saga/core'
import { all, call, put, race, take, takeEvery } from 'redux-saga/effects'
import { NET_ACTION, OAuthToken } from 'studiokit-net-js'

import { AUTH_ACTION, createAction } from './actions'
import {
	codeProviderService as defaultCodeProviderService,
	ticketProviderService as defaultTicketProviderService,
	tokenPersistenceService as defaultTokenPersistenceService
} from './services'
import {
	ClientCredentials,
	CodeProviderService,
	Credentials,
	LoggerFunction,
	TicketProviderService,
	TokenPersistenceService
} from './types'

//#region Helpers

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 *
 * @param {string} message - The message to log
 */
const defaultLogger: LoggerFunction = (message: string) => {
	console.debug(message)
}

export const matchesModelFetchReceived = (action: any, modelName: string) =>
	action.type === NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === modelName

export const takeMatchesModelFetchReceived = (modelName: string) => (incomingAction: any) =>
	matchesModelFetchReceived(incomingAction, modelName)

export const matchesModelFetchFailed = (action: any, modelName: string) =>
	action.type === NET_ACTION.TRANSIENT_FETCH_FAILED && action.modelName === modelName

export const takeMatchesModelFetchFailed = (modelName: string) => (incomingAction: any) =>
	matchesModelFetchFailed(incomingAction, modelName)

export const matchesTokenRefreshSucceeded = (action: any) =>
	action.type === AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED

export const takeMatchesTokenRefreshSucceeded = () => (incomingAction: any) =>
	matchesTokenRefreshSucceeded(incomingAction)

export const matchesTokenRefreshFailed = (action: any) =>
	action.type === AUTH_ACTION.TOKEN_REFRESH_FAILED

export const takeMatchesTokenRefreshFailed = () => (incomingAction: any) =>
	matchesTokenRefreshFailed(incomingAction)

//#endregion Helpers

//#region Local Variables

let clientCredentials: ClientCredentials
let oauthToken: OAuthToken | undefined
let logger: LoggerFunction
let tokenPersistenceService: TokenPersistenceService
let refreshLock: boolean

//#endregion Local Variables

export function* getTokenFromCode(code: string): SagaIterator {
	const getTokenModelName = 'getToken'
	// Manually creating form-url-encoded body here because NOTHING else uses this content-type
	// but the OAuth spec requires it
	const formBody = [
		'grant_type=authorization_code',
		`client_id=${clientCredentials.client_id}`,
		`client_secret=${clientCredentials.client_secret}`,
		`code=${encodeURIComponent(code)}`
	]
	const formBodyString = formBody.join('&')
	yield put(
		createAction(NET_ACTION.DATA_REQUESTED, {
			modelName: getTokenModelName,
			body: formBodyString,
			noStore: true
		})
	)
	const { fetchReceived, fetchFailed } = yield race({
		fetchReceived: take(takeMatchesModelFetchReceived(getTokenModelName)),
		fetchFailed: take(takeMatchesModelFetchFailed(getTokenModelName))
	})
	if ((fetchReceived && !fetchReceived.data) || fetchFailed) {
		return null
	}
	return fetchReceived.data
}

export function* getTokenFromRefreshToken(oauthTokenParam: OAuthToken): SagaIterator {
	const getTokenModelName = 'getToken'
	// Manually creating form-url-encoded body here because NOTHING else uses this content-type
	// but the OAuth spec requires it
	const formBody = [
		'grant_type=refresh_token',
		`client_id=${clientCredentials.client_id}`,
		`client_secret=${clientCredentials.client_secret}`,
		`refresh_token=${encodeURIComponent(oauthTokenParam.refresh_token)}`
	]
	const formBodyString = formBody.join('&')
	yield put(
		createAction(NET_ACTION.DATA_REQUESTED, {
			modelName: getTokenModelName,
			body: formBodyString,
			noStore: true,
			timeLimit: 60000
		})
	)
	const { fetchReceived, fetchFailed } = yield race({
		fetchReceived: take(takeMatchesModelFetchReceived(getTokenModelName)),
		fetchFailed: take(takeMatchesModelFetchFailed(getTokenModelName))
	})
	// for some reason the response had no body
	if (fetchReceived && !fetchReceived.data) {
		return null
	}
	// any error response
	if (fetchFailed) {
		// ignore time outs and server errors
		if (
			fetchFailed.errorData &&
			(fetchFailed.errorData.didTimeOut || fetchFailed.errorData.code >= 500)
		) {
			return oauthTokenParam
		}
		return null
	}
	return fetchReceived.data
}

export function* performTokenRefresh(): SagaIterator {
	if (refreshLock || !oauthToken) {
		// already refreshing. wait for the current refresh to succeed or fail.
		yield race({
			refreshSuccess: take(takeMatchesTokenRefreshSucceeded()),
			refreshFailed: take(takeMatchesTokenRefreshFailed())
		})
		return
	}
	logger('Refreshing OAuth token')
	refreshLock = true
	// oauthToken will be set to:
	// 1. new token (success)
	// 2. same token (failed from timeout or server error)
	// 3. null (fail)
	const originalAccessToken = oauthToken.access_token
	oauthToken = yield call(getTokenFromRefreshToken, oauthToken)
	if (!!oauthToken && oauthToken.access_token !== originalAccessToken) {
		logger('OAuth token refreshed')
		yield call(tokenPersistenceService.persistToken, oauthToken)
		yield put(createAction(AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED, { oauthToken }))
	} else if (oauthToken === null) {
		logger('OAuth token failed to refresh')
		// This should never happen outside of the token having been revoked on the server side
		yield all({
			refreshFailed: put(createAction(AUTH_ACTION.TOKEN_REFRESH_FAILED)),
			logOut: put(createAction(AUTH_ACTION.LOG_OUT_REQUESTED))
		})
	}
	refreshLock = false
}

export function* loginFlow(actionPayload: object, modelName: string): SagaIterator {
	yield put(createAction(NET_ACTION.DATA_REQUESTED, actionPayload))
	const { fetchReceived, fetchFailed } = yield race({
		fetchReceived: take(takeMatchesModelFetchReceived(modelName)),
		fetchFailed: take(takeMatchesModelFetchFailed(modelName))
	})
	if (fetchFailed) {
		return null
	}
	let code
	// TODO: ...data.Code || ...data.code is because Forecast uses capitalized property names. Needs fixing
	if (fetchReceived.data && (fetchReceived.data.Code || fetchReceived.data.code)) {
		code = fetchReceived.data.Code || fetchReceived.data.code
	}
	if (!code) {
		return null
	}
	return yield call(getTokenFromCode, code)
}

export function* credentialsLoginFlow(credentials: Credentials, modelName: string): SagaIterator {
	return yield call(
		loginFlow,
		{
			modelName,
			noStore: true,
			body: credentials,
			timeLimit: 120000
		},
		modelName
	)
}

export function* casProxyLoginFlow(credentials: Credentials): SagaIterator {
	return yield call(credentialsLoginFlow, credentials, 'codeFromCasProxy')
}

export function* casV1LoginFlow(credentials: Credentials): SagaIterator {
	return yield call(credentialsLoginFlow, credentials, 'codeFromCasV1')
}

export function* localLoginFlow(credentials: Credentials): SagaIterator {
	return yield call(credentialsLoginFlow, credentials, 'codeFromLocalCredentials')
}

export function* casTicketLoginFlow(ticket: string, service: string): SagaIterator {
	const modelName = 'codeFromCasTicket'
	return yield call(
		loginFlow,
		{
			modelName,
			noStore: true,
			queryParams: {
				ticket,
				service
			}
		},
		modelName
	)
}

export function* handleAuthFailure(action: any): SagaIterator {
	// This should be unlikely since we normally have a refresh token loop happening
	// but if the app is backgrounded, the loop might not be caught up yet
	if (
		oauthToken &&
		action.errorData &&
		action.errorData.code >= 400 &&
		action.errorData.code <= 499
	) {
		logger('token expired - refreshing')
		yield call(performTokenRefresh)
	}
}

export function* getOauthToken(modelName: string): SagaIterator {
	// Don't try to refresh the token if we're already in a request to refresh the token
	if (modelName === 'getToken') {
		return null
	}
	if (oauthToken && oauthToken['.expires']) {
		const thirtySecondsFromNow = new Date()
		thirtySecondsFromNow.setSeconds(thirtySecondsFromNow.getSeconds() + 30)
		if (new Date(oauthToken['.expires']) < thirtySecondsFromNow) {
			// start a token refresh and wait for the success action in case another refresh is currently happening
			yield call(performTokenRefresh)
			return oauthToken
		}
	}
	return oauthToken
}

export default function* authSaga(
	clientCredentialsParam: ClientCredentials,
	tokenPersistenceServiceParam: TokenPersistenceService = defaultTokenPersistenceService,
	ticketProviderService: TicketProviderService = defaultTicketProviderService,
	codeProviderService: CodeProviderService = defaultCodeProviderService,
	loggerParam: LoggerFunction = defaultLogger
): SagaIterator {
	/* istanbul ignore if */
	if (!clientCredentialsParam) {
		throw new Error("'clientCredentialsParam' is required for authSaga")
	}
	clientCredentials = clientCredentialsParam
	tokenPersistenceService = tokenPersistenceServiceParam
	logger = loggerParam
	logger(`logger set to ${logger.name}`)

	// Try to get persisted token (normally in AsyncStorage or LocalStorage)
	oauthToken = yield call(tokenPersistenceService.getPersistedToken)

	// If no token, try to get CAS ticket (normally in the URL), use it to get a token
	if (!oauthToken) {
		const casTicket = ticketProviderService.getTicket()
		ticketProviderService.removeTicket()
		const service = ticketProviderService.getAppServiceName()
		if (casTicket && service) {
			oauthToken = yield call(casTicketLoginFlow, casTicket, service)
		}
	}

	// If no token, try to get OAuth Code (normally in the URL), use it to get a token
	// e.g. Shibboleth, Facebook, Google
	if (!oauthToken) {
		const code = codeProviderService.getCode()
		codeProviderService.removeCode()
		if (code) {
			oauthToken = yield call(getTokenFromCode, code)
		}
	}

	yield put(createAction(AUTH_ACTION.AUTH_INITIALIZED, { oauthToken }))

	yield takeEvery(NET_ACTION.TRY_FETCH_FAILED, handleAuthFailure)

	do {
		if (!oauthToken) {
			const { casV1Action, casProxyAction, localAction } = yield race({
				casV1Action: take(AUTH_ACTION.CAS_V1_LOGIN_REQUESTED),
				casProxyAction: take(AUTH_ACTION.CAS_PROXY_LOGIN_REQUESTED),
				localAction: take(AUTH_ACTION.LOCAL_LOGIN_REQUESTED)
			})

			yield put(createAction(AUTH_ACTION.LOGIN_REQUESTED))
			if (casV1Action) {
				oauthToken = yield call(casV1LoginFlow, casV1Action.payload)
			} else if (casProxyAction) {
				oauthToken = yield call(casProxyLoginFlow, casProxyAction.payload)
			} else if (localAction) {
				oauthToken = yield call(localLoginFlow, localAction.payload)
			}
		}

		if (oauthToken) {
			yield call(tokenPersistenceService.persistToken, oauthToken)
			yield all({
				loginSuccess: put(createAction(AUTH_ACTION.GET_TOKEN_SUCCEEDED, { oauthToken })),
				getUserInfo: put(
					createAction(NET_ACTION.DATA_REQUESTED, { modelName: 'user.userInfo' })
				),
				logOut: take(AUTH_ACTION.LOG_OUT_REQUESTED)
			})
		} else {
			yield put(createAction(AUTH_ACTION.LOGIN_FAILED))
		}

		yield all({
			clearUserData: put(
				createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, { modelName: 'user' })
			),
			clearPersistentToken: call(tokenPersistenceService.persistToken, null)
		})
		oauthToken = undefined
	} while (true)
}
