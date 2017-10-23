// @flow

import { call, put, race, take, takeEvery, all } from 'redux-saga/effects'
import { actions as netActions } from 'studiokit-net-js'

import type {
	OAuthToken,
	ClientCredentials,
	Credentials,
	LoggerFunction,
	TokenPersistenceService,
	TicketProviderService,
	CodeProviderService
} from './types'
import actions, { createAction } from './actions'
import {
	tokenPersistenceService as defaultTokenPersistenceService,
	ticketProviderService as defaultTicketProviderService,
	codeProviderService as defaultCodeProviderService
} from './services'

//#region Helpers

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 * 
 * @param {string} message - The message to log
 */
const defaultLogger: LoggerFunction = (message: string) => {
	console.debug(message)
}

const matchesModelFetchReceived = (action, modelName) =>
	action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === modelName

const takeMatchesModelFetchReceived = modelName => incomingAction =>
	matchesModelFetchReceived(incomingAction, modelName)

const matchesModelFetchFailed = (action, modelName) =>
	action.type === netActions.TRANSIENT_FETCH_FAILED && action.modelName === modelName

const takeMatchesModelFetchFailed = modelName => incomingAction =>
	matchesModelFetchFailed(incomingAction, modelName)

//#endregion Helpers

//#region Local Variables

let clientCredentials: ClientCredentials
let oauthToken: ?OAuthToken
let logger: LoggerFunction
let tokenPersistenceService: TokenPersistenceService
let refreshLock: boolean

//#endregion Local Variables

function* getTokenFromCode(code: string): Generator<*, ?OAuthToken, *> {
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
		createAction(netActions.DATA_REQUESTED, {
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

function* getTokenFromRefreshToken(oauthToken: OAuthToken): Generator<*, ?OAuthToken, *> {
	const getTokenModelName = 'getToken'
	// Manually creating form-url-encoded body here because NOTHING else uses this content-type
	// but the OAuth spec requires it
	const formBody = [
		'grant_type=refresh_token',
		`client_id=${clientCredentials.client_id}`,
		`client_secret=${clientCredentials.client_secret}`,
		`refresh_token=${encodeURIComponent(oauthToken.refresh_token)}`
	]
	const formBodyString = formBody.join('&')
	yield put(
		createAction(netActions.DATA_REQUESTED, {
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
			return oauthToken
		}
		return null
	}
	return fetchReceived.data
}

function* performTokenRefresh(): Generator<*, void, *> {
	if (refreshLock || !oauthToken) return
	logger('Refreshing OAuth token')
	refreshLock = true
	// oauthToken will be set to:
	// 1. new token (success)
	// 2. same token (failed from timeout or server error)
	// 3. null (fail)
	const originalAccessToken = oauthToken.access_token
	oauthToken = yield call(getTokenFromRefreshToken, oauthToken)
	if (oauthToken && oauthToken.access_token !== originalAccessToken) {
		logger('OAuth token refreshed')
		yield all({
			refreshSuccess: put(
				createAction(actions.TOKEN_REFRESH_SUCCEEDED, { oauthToken: oauthToken })
			),
			persistToken: call(tokenPersistenceService.persistToken, oauthToken)
		})
	} else if (oauthToken === null) {
		logger('OAuth token failed to refresh')
		// This should never happen outside of the token having been revoked on the server side
		yield all({
			refreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED)),
			logOut: put(createAction(actions.LOG_OUT_REQUESTED))
		})
	}
	refreshLock = false
}

function* loginFlow(actionPayload: Object, modelName: string): Generator<*, ?OAuthToken, *> {
	yield put(createAction(netActions.DATA_REQUESTED, actionPayload))
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

function* credentialsLoginFlow(
	credentials: Credentials,
	modelName: string
): Generator<*, ?OAuthToken, *> {
	return yield call(
		loginFlow,
		{
			modelName: modelName,
			noStore: true,
			body: credentials,
			timeLimit: 120000
		},
		modelName
	)
}

function* casProxyLoginFlow(credentials: Credentials): Generator<*, ?OAuthToken, *> {
	return yield call(credentialsLoginFlow, credentials, 'codeFromCasProxy')
}

function* casV1LoginFlow(credentials: Credentials): Generator<*, ?OAuthToken, *> {
	return yield call(credentialsLoginFlow, credentials, 'codeFromCasV1')
}

function* localLoginFlow(credentials: Credentials): Generator<*, ?OAuthToken, *> {
	return yield call(credentialsLoginFlow, credentials, 'codeFromLocalCredentials')
}

function* casTicketLoginFlow(ticket: string, service: string): Generator<*, ?OAuthToken, *> {
	const modelName = 'codeFromCasTicket'
	return yield call(
		loginFlow,
		{
			modelName: modelName,
			noStore: true,
			queryParams: {
				ticket,
				service
			}
		},
		modelName
	)
}

function* handleAuthFailure(action): Generator<*, *, *> {
	// This should be unlikely since we normally have a refresh token loop happening
	// but if the app is backgrounded, the loop might not be caught up yet
	if (
		oauthToken &&
		action.errorData.code >= 400 &&
		action.errorData.code <= 499 &&
		new Date(oauthToken['.expires']) < new Date()
	) {
		logger('token expired - refreshing')
		yield call(performTokenRefresh)
	}
}

export function* getOauthToken(modelName: string): Generator<*, ?OAuthToken, *> {
	// Don't try to refresh the token if we're already in a request to refresh the token
	if (modelName === 'getToken') {
		return null
	}
	if (oauthToken && oauthToken['.expires']) {
		let thirtySecondsFromNow = new Date()
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
): Generator<*, void, *> {
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

	yield put(createAction(actions.AUTH_INITIALIZED))

	yield takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)

	while (true) {
		if (!oauthToken) {
			const { casV1Action, casProxyAction, localAction } = yield race({
				casV1Action: take(actions.CAS_V1_LOGIN_REQUESTED),
				casProxyAction: take(actions.CAS_PROXY_LOGIN_REQUESTED),
				localAction: take(actions.LOCAL_LOGIN_REQUESTED)
			})

			yield put(createAction(actions.LOGIN_REQUESTED))
			if (casV1Action) {
				oauthToken = yield call(casV1LoginFlow, casV1Action.payload)
			} else if (casProxyAction) {
				oauthToken = yield call(casProxyLoginFlow, casProxyAction.payload)
			} else if (localAction) {
				oauthToken = yield call(localLoginFlow, localAction.payload)
			}
		}

		if (oauthToken) {
			yield all({
				loginSuccess: put(createAction(actions.GET_TOKEN_SUCCEEDED, { oauthToken })),
				persistToken: call(tokenPersistenceService.persistToken, oauthToken),
				getUserInfo: put(createAction(netActions.DATA_REQUESTED, { modelName: 'user.userInfo' })),
				logOut: take(actions.LOG_OUT_REQUESTED)
			})
		} else {
			yield put(createAction(actions.LOGIN_FAILED))
		}

		yield all({
			clearUserData: put(createAction(netActions.KEY_REMOVAL_REQUESTED, { modelName: 'user' })),
			clearPersistentToken: call(tokenPersistenceService.persistToken, null)
		})
		oauthToken = null
	}
}
