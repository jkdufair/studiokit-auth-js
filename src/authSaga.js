import { call, put, race, take, takeEvery, all } from 'redux-saga/effects'
import { actions as netActions } from 'studiokit-net-js'
import actions, { createAction } from './actions'
import { tokenPersistenceService as defaultTokenPersistenceService } from './services'

let clientCredentials, oauthToken
let logger
let tokenPersistenceService
let refreshLock

// TODO: ...data.Code || ...data.code is because Forecast uses capitalized property names. Needs fixing
function* getTokenFromCode(code) {
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
	const tokenFetchResultAction = yield take(
		action =>
			action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED &&
			action.modelName === getTokenModelName
	)
	return tokenFetchResultAction.data.error ? null : tokenFetchResultAction.data
}

function* getTokenFromRefreshToken(oauthToken) {
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
			noAuth: true,
			noStore: true,
			timeLimit: 60000
		})
	)
	const tokenFetchResultAction = yield take(
		action =>
			action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED &&
			action.modelName === getTokenModelName
	)
	if (tokenFetchResultAction.data.error) {
		// This should never happen outside of the token having been revoked on the server side
		yield all({
			logOut: put(createAction(actions.LOG_OUT_REQUESTED)),
			signalRefreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED))
		})
		return null
	} else {
		return tokenFetchResultAction.data
	}
}

function* performTokenRefresh() {
	logger('Refreshing OAuth token')
	if (refreshLock) return
	refreshLock = true
	oauthToken = yield call(getTokenFromRefreshToken, oauthToken)
	yield all({
		sendTokenForIntercept: put(
			createAction(actions.TOKEN_REFRESH_SUCCEEDED, { oauthToken: oauthToken })
		),
		persistToken: call(tokenPersistenceService.persistToken, oauthToken)
	})
	refreshLock = false
	logger('OAuth token refreshed')
}

function* casCredentialsLoginFlow(credentials, modelName) {
	yield put(
		createAction(netActions.DATA_REQUESTED, {
			modelName: modelName,
			body: credentials,
			noStore: true,
			timeLimit: 120000
		})
	)
	const { resultReceived, loginFailed } = yield race({
		resultReceived: take(
			action =>
				action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === modelName
		),
		loginFailed: take(
			action => action.type === netActions.FETCH_FAILED && action.modelName === modelName
		)
	})
	if (loginFailed) {
		return null
	}
	const code = resultReceived.data.Code || resultReceived.data.code
	if (!code) {
		return null
	}
	return yield getTokenFromCode(code)
}

function* casProxyLoginFlow(credentials) {
	return yield call(casCredentialsLoginFlow, credentials, 'codeFromCasProxy')
}

function* casV1LoginFlow(credentials) {
	return yield call(casCredentialsLoginFlow, credentials, 'codeFromCasV1')
}

function* casTicketLoginFlow(ticket) {
	const getCodeModelName = 'codeFromCasTicket'
	yield put(
		createAction(netActions.DATA_REQUESTED, {
			modelName: getCodeModelName,
			noStore: true,
			queryParams: {
				ticket
			}
		})
	)
	const action = yield take(
		action =>
			action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED &&
			action.modelName === getCodeModelName
	)
	const code = action.data.Code || action.data.code
	if (!code) {
		return null
	}
	return yield getTokenFromCode(code)
}

function* shibLoginFlow() {
	// code -> token
	return 'tokenViaShib'
}

function* localLoginFlow(credentials) {
	// credentials -> code -> token
	const getCodeModelName = 'codeFromLocalCredentials'
	yield put(
		createAction(netActions.DATA_REQUESTED, {
			modelName: getCodeModelName,
			body: credentials,
			noStore: true
		})
	)
	const action = yield take(
		action =>
			(action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED ||
				action.type === netActions.FETCH_FAILED) &&
			action.modelName === getCodeModelName
	)
	let code
	if (action.data && (action.data.Code || action.data.code)) {
		code = action.data.Code || action.data.code
	}
	if (!code) {
		return null
	}
	return yield getTokenFromCode(code)
}

function* facebookLoginFlow(payload) {
	// ???
	return 'noFreakingClue'
}

function* handleAuthFailure(action) {
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

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 * 
 * @param {string} message - The message to log
 */
const consoleLogger = message => {
	console.debug(message)
}

export default function* authSaga(
	clientCredentialsParam,
	tokenPersistenceServiceParam = defaultTokenPersistenceService,
	loggerParam = consoleLogger
) {
	if (!clientCredentialsParam) {
		throw new Error("'clientCredentials' is required for auth saga")
	}
	clientCredentials = clientCredentialsParam

	tokenPersistenceService = tokenPersistenceServiceParam
	oauthToken = yield call(tokenPersistenceService.getPersistedToken)
	yield put(createAction(actions.AUTH_INITIALIZED))

	logger = loggerParam
	logger(`logger set to ${logger.name}`)

	yield takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)

	while (true) {
		if (!oauthToken) {
			const {
				casV1Action,
				casProxyAction,
				casAction,
				shibAction,
				localAction,
				facebookAction
			} = yield race({
				casV1Action: take(actions.CAS_V1_LOGIN_REQUESTED),
				casProxyAction: take(actions.CAS_PROXY_LOGIN_REQUESTED),
				casAction: take(actions.CAS_LOGIN_REQUESTED),
				shibAction: take(actions.SHIB_LOGIN_REQUESTED),
				localAction: take(actions.LOCAL_LOGIN_REQUESTED),
				facebookAction: take(actions.FACEBOOK_LOGIN_REQUESTED)
			})

			yield put(createAction(actions.LOGIN_REQUESTED))
			if (casV1Action) {
				oauthToken = yield call(casV1LoginFlow, casV1Action.payload)
			} else if (casProxyAction) {
				oauthToken = yield call(casProxyLoginFlow, casProxyAction.payload)
			} else if (casAction) {
				oauthToken = yield call(casTicketLoginFlow, casAction.payload)
			} else if (shibAction) {
				oauthToken = yield call(shibLoginFlow, shibAction.payload)
			} else if (localAction) {
				oauthToken = yield call(localLoginFlow, localAction.payload)
			} else if (facebookAction) {
				oauthToken = yield call(facebookLoginFlow, facebookAction.payload)
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

export function* getOauthToken(modelName) {
	//Don't try to refresh the token if we're already in a request to refresh the token
	if (modelName === 'getToken') {
		return null
	}
	if (oauthToken && oauthToken['.expires']) {
		let currentTime = new Date()
		currentTime.setSeconds(currentTime.getSeconds() - 30)
		if (new Date(oauthToken['.expires']) < currentTime) {
			//start a token refresh and wait for the success action in case another refresh is currently happening
			yield all([call(performTokenRefresh), take(actions.TOKEN_REFRESH_SUCCEEDED)])
			return oauthToken
		}
	}
	return oauthToken
}
