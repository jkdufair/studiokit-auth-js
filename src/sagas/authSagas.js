import { call, put, race, take, all } from 'redux-saga/effects'
import actions, { createAction } from '../actions'
import { actions as netActions } from 'studiokit-net-js'
import { authService } from '../services'

let clientCredentials
let oauthToken

function* casLoginFlow() {
	// ticket -> code -> token
	return 'tokenViaCas'
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
	const action = yield take((action) => action.type === netActions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName)
	const code = action.data.Code
	if (!code) {
		return null
	}

	const getTokenModelName = 'tokenFromCode'
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

function* facebookLoginFlow(payload) {
	// ???
	return 'noFreakingClue'
}

export function* auth(clientCredentialsParam) {
	if (!clientCredentialsParam) {
		throw new Error('\'clientCredentials\' is required for auth saga')
	}
	clientCredentials = clientCredentialsParam

	oauthToken = yield call(authService.getPersistedToken)
	while (true) {
		if (!oauthToken) {
			const { casAction, shibAction, localAction, facebookAction } = yield race({
				casAction: take(actions.CAS_LOGIN_REQUESTED),
				shibAction: take(actions.SHIB_LOGIN_REQUESTED),
				localAction: take(actions.LOCAL_LOGIN_REQUESTED),
				facebookAction: take(actions.FACEBOOK_LOGIN_REQUESTED)
			});
			
			if (casAction) {
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
				persistToken: call(authService.persistToken, oauthToken),
				loginSuccess: put(createAction(actions.LOGIN_SUCCEEDED, { oauthToken })),
				logOut: take(actions.LOG_OUT_REQUESTED)
			})
		} else {
			yield put(createAction(actions.LOGIN_FAILED))
		}

		yield all({
			clearUserData: put(createAction(netActions.KEY_REMOVAL_REQUESTED, {modelName: 'user'})),
			clearPersistentToken: call(authService.persistToken, null)
		})
		oauthToken = null;
	}
}