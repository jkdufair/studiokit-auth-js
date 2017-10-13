const AUTH_INITIALIZED = 'auth/INITIALIZED'

// App level requests
const CAS_V1_LOGIN_REQUESTED = 'application/CAS_V1_LOGIN_REQUESTED'
const CAS_PROXY_LOGIN_REQUESTED = 'application/CAS_PROXY_LOGIN_REQUESTED'
const CAS_LOGIN_REQUESTED = 'application/CAS_LOGIN_REQUESTED'
const LOCAL_LOGIN_REQUESTED = 'application/LOCAL_LOGIN_REQUESTED'
const LOGIN_REQUESTED = 'auth/LOGIN_REQUESTED'
const LOG_OUT_REQUESTED = 'auth/LOG_OUT_REQUESTED'

// System level responses
const GET_TOKEN_SUCCEEDED = 'auth/GET_TOKEN_SUCCEEDED'
const TOKEN_REFRESH_SUCCEEDED = 'auth/TOKEN_REFRESH_SUCCEEDED'
const TOKEN_REFRESH_FAILED = 'auth/TOKEN_REFRESH_FAILED'
const LOGIN_FAILED = 'auth/LOGIN_FAILED'

export function createAction(type, payload) {
	return Object.assign({}, { type }, payload)
}

export default {
	AUTH_INITIALIZED,
	CAS_V1_LOGIN_REQUESTED,
	CAS_PROXY_LOGIN_REQUESTED,
	CAS_LOGIN_REQUESTED,
	LOCAL_LOGIN_REQUESTED,
	LOGIN_REQUESTED,
	LOG_OUT_REQUESTED,
	GET_TOKEN_SUCCEEDED,
	TOKEN_REFRESH_FAILED,
	TOKEN_REFRESH_SUCCEEDED,
	LOGIN_FAILED
}
