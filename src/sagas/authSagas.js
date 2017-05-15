import { delay } from 'redux-saga'
import { call, put, race, take, takeEvery, all } from 'redux-saga/effects'
import actions, { createAction } from '../actions'
import { actions as netActions } from 'studiokit-net-js'
import { tokenPersistenceService } from '../services'

let clientCredentials, oauthToken

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
	yield put(createAction(netActions.DATA_REQUESTED, {
		modelName: getTokenModelName,
		body: formBodyString,
		noStore: true
	}))
	const tokenFetchResultAction = yield take((action) => action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getTokenModelName)
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
	yield put(createAction(netActions.DATA_REQUESTED, {
		modelName: getTokenModelName,
		body: formBodyString,
		noStore: true
	}))
	const tokenFetchResultAction = yield take((action) => action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getTokenModelName)
	if (tokenFetchResultAction.data.error) {
		// This should never happen outside of the token having been revoked on the server side
		yield all({
			logOut: put(createAction(actions.LOG_OUT_REQUESTED)),
			signalRefreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED))
		}) 
		return null
	} else {
		const refreshedToken = tokenFetchResultAction.data
		yield put(createAction(actions.TOKEN_REFRESH_SUCCEEDED, { oauthToken: refreshedToken }))
		yield call(tokenPersistenceService.persistToken, refreshedToken)
		return refreshedToken
	}
}

function* tokenRefreshLoop() {
	while (oauthToken) {
		const { timerExpired } = yield race({
			// refresh when token hits 95% of the way to its expiration
			timerExpired: call(delay, oauthToken.expires_in * .95 * 1000),
			loggedOut: take(actions.LOG_OUT_REQUESTED)
		})
		if (timerExpired) {
			oauthToken = yield call(getTokenFromRefreshToken, oauthToken)
		} else {
			oauthToken = null
		}
	}
}

function* headlessCasLoginFlow(credentials) {
	const getCodeModelName = 'codeFromCasCredentials'
	yield put(createAction(netActions.DATA_REQUESTED, {
		modelName: getCodeModelName,
		body: credentials,
		noStore: true,
		timeLimit: 120000
	}))
	const action = yield take((action) => action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName)
	const code = action.data.Code
	if (!code) {
		return null
	}
	return yield getTokenFromCode(code)
}

function* casLoginFlow(ticket) {
	const getCodeModelName = 'codeFromCasTicket'
	yield put(createAction(netActions.DATA_REQUESTED, {
		modelName: getCodeModelName,
		noStore: true,
		queryParams: {
			ticket
		}
	}))
	const action = yield take((action) => action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName)
	const code = action.data.Code
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
	yield put(createAction(netActions.DATA_REQUESTED, {
		modelName: getCodeModelName,
		body: credentials,
		noStore: true
	}))
	const action = yield take((action) =>
		(action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED || action.type === netActions.FETCH_FAILED)
			&& action.modelName === getCodeModelName)
	let code
	if (action.data && action.data.code) {
		code = action.data.Code
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
	if (oauthToken && action.errorData.code >= 400 && action.errorData.code <= 499) {
		oauthToken = yield call(getTokenFromRefreshToken, oauthToken)
	}
}

export function* auth(clientCredentialsParam, tokenPersistenceServiceParam = tokenPersistenceService) {
	const localTokenPersistenceService = tokenPersistenceServiceParam
	if (!clientCredentialsParam) {
		throw new Error('\'clientCredentials\' is required for auth saga')
	}
	clientCredentials = clientCredentialsParam

	yield takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)

	oauthToken = yield call(localTokenPersistenceService.getPersistedToken)
	while (true) {
		if (!oauthToken) {
			const { headlessCasAction, casAction, shibAction, localAction, facebookAction } = yield race({
				headlessCasAction: take(actions.HEADLESS_CAS_LOGIN_REQUESTED),
				casAction: take(actions.CAS_LOGIN_REQUESTED),
				shibAction: take(actions.SHIB_LOGIN_REQUESTED),
				localAction: take(actions.LOCAL_LOGIN_REQUESTED),
				facebookAction: take(actions.FACEBOOK_LOGIN_REQUESTED)
			});

			yield put(createAction(actions.LOGIN_REQUESTED))			
			if (headlessCasAction) {
				oauthToken = yield call(headlessCasLoginFlow, headlessCasAction.payload);
			} else if (casAction) {
				oauthToken = yield call(casLoginFlow, casAction.payload);
			} else if (shibAction) {
				oauthToken = yield call(shibLoginFlow, shibAction.payload);
			} else if (localAction) {
				oauthToken = yield call(localLoginFlow, localAction.payload);
			} else if (facebookAction) {
				oauthToken = yield call(facebookLoginFlow, facebookAction.payload);
			}
		}

		if (oauthToken) {
			yield all({
				persistToken: call(localTokenPersistenceService.persistToken, oauthToken),
				loginSuccess: put(createAction(actions.GET_TOKEN_SUCCEEDED, { oauthToken })),
				refreshLoop: call(tokenRefreshLoop, oauthToken),
				logOut: take(actions.LOG_OUT_REQUESTED)
			})
		} else {
			yield put(createAction(actions.LOGIN_FAILED))
		}

		yield all({
			clearUserData: put(createAction(netActions.KEY_REMOVAL_REQUESTED, {modelName: 'user'})),
			clearPersistentToken: call(localTokenPersistenceService.persistToken, null)
		})
		oauthToken = null;
	}
}