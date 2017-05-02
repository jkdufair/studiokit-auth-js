import { call, put, race, take, takeEvery } from 'redux-saga/effects';
import { auth } from '../services';
import actions, { createAction } from '../actions';

function* casLoginFlow(payload) {
	// ticket -> code -> token
	console.log('casLoginFlow')
}

function* shibLoginFlow(payload) {
	// code -> token
}

function* localLoginFlow(payload) {
	// credentials -> code -> token
}

function* facebookLoginFlow(payload) {
	// ???
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

			yield put(createAction(actions.STORE_TOKEN, { token: token }))
			yield call(auth.persistToken, token)
		}

		yield put(createAction(actions.LOGIN_SUCCESS))

		// get user data

		yield take(actions.LOG_OUT);
		
		yield put(createAction(actions.DELETE_TOKEN))
		yield call(auth.persistToken, null);
		token = null;
	}
}