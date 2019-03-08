import { Action } from 'redux'

export enum AUTH_ACTION {
	AUTH_INITIALIZED = 'auth/INITIALIZED',

	// App level requests
	CAS_V1_LOGIN_REQUESTED = 'application/CAS_V1_LOGIN_REQUESTED',
	CAS_PROXY_LOGIN_REQUESTED = 'application/CAS_PROXY_LOGIN_REQUESTED',
	CAS_LOGIN_REQUESTED = 'application/CAS_LOGIN_REQUESTED',
	LOCAL_LOGIN_REQUESTED = 'application/LOCAL_LOGIN_REQUESTED',
	LOGIN_REQUESTED = 'auth/LOGIN_REQUESTED',
	LOG_OUT_REQUESTED = 'auth/LOG_OUT_REQUESTED',

	// System level responses
	GET_TOKEN_SUCCEEDED = 'auth/GET_TOKEN_SUCCEEDED',
	TOKEN_REFRESH_SUCCEEDED = 'auth/TOKEN_REFRESH_SUCCEEDED',
	TOKEN_REFRESH_FAILED = 'auth/TOKEN_REFRESH_FAILED',
	LOGIN_FAILED = 'auth/LOGIN_FAILED'
}

export function createAction(type: string, payload?: any): Action {
	return Object.assign({}, { type }, payload)
}
