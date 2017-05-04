import { call, put, race, take, all } from 'redux-saga/effects'
import actions, { createAction } from '../actions'
import { actions as netActions } from 'studiokit-net-js'
import { authService } from '../services'

let clientCredentials

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
	yield put(createAction(netActions.FETCH_DATA, {
		modelName: getCodeModelName,
		body: credentials
	}))
	const action = yield take((action) => action.type === netActions.STORE_FETCH_RESULT && action.modelName === getCodeModelName)
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
	yield put(createAction(netActions.FETCH_DATA, {
		modelName: getTokenModelName,
		body: formBodyString
	}))
	return yield take((action) => action.type === netActions.STORE_FETCH_RESULT && action.modelName === getTokenModelName)
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

	const persistentToken = yield call(authService.getPersistedToken);

	if (persistentToken) {
		yield put(createAction(actions.STORE_TOKEN, { token: persistentToken }))
	}

	let token = persistentToken;
	while (true) {
		if (!token) {
			const { casAction, shibAction, localAction, facebookAction } = yield race({
				casAction: take(actions.CAS_LOGIN),
				shibAction: take(actions.SHIB_LOGIN),
				localAction: take(actions.LOCAL_LOGIN),
				facebookAction: take(actions.FACEBOOK_LOGIN)
			});

			if (casAction) {
				token = yield call(casLoginFlow, casAction.payload);
			} else if (shibAction) {
				token = yield call(shibLoginFlow, shibAction.payload);
			} else if (localAction) {
				token = yield call(localLoginFlow, localAction.payload);
			} else if (facebookAction) {
				token = yield call(facebookLoginFlow, facebookAction.payload);
			}

			yield all({
				storeToken: put(createAction(actions.STORE_TOKEN, { token: token })),
				persistToken: call(authService.persistToken, token)
			})
		}

		if (token) {
			yield all({
				loginSuccess: put(createAction(actions.LOGIN_SUCCESS)),
				logOut: take(actions.LOG_OUT)
			})

			yield all({
				deleteToken: put(createAction(actions.DELETE_TOKEN)),
				deletePersistedToken: call(authService.persistToken, null)
			});
			token = null;
		}

		// TODO: put login failure
	}
}