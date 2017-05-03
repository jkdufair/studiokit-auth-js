import { call, put, race, take, all } from 'redux-saga/effects';
import actions, { createAction } from '../actions';
import { auth } from '../services';

function* casLoginFlow(payload) {
	// ticket -> code -> token
	return 'tokenViaCas'
}

function* shibLoginFlow(payload) {
	// code -> token
	return 'tokenViaShib'
}

function* localLoginFlow(payload) {
	// credentials -> code -> token
	return 'tokenViaLocal'
}

function* facebookLoginFlow(payload) {
	// ???
	return 'noFreakingClue'
}

export function* loginFlow() {
	const persistentToken = yield call(auth.getPersistedToken);

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
				persistToken: call(auth.persistToken, token)
			})
		}

		yield all({
			loginSuccess: put(createAction(actions.LOGIN_SUCCESS)),
			logOut: take(actions.LOG_OUT)
		})

		yield all({
			deleteToken: put(createAction(actions.DELETE_TOKEN)),
			deletePersistedToken: call(auth.persistToken, null)
		});
		token = null;
	}
}