const STORE_TOKEN = 'STORE_TOKEN'
const DELETE_TOKEN = 'DELETE_TOKEN'
const CAS_LOGIN = 'CAS_LOGIN'
const SHIB_LOGIN = 'SHIB_LOGIN'
const LOCAL_LOGIN = 'LOCAL_LOGIN'
const FACEBOOK_LOGIN = 'FACEBOOK_LOGIN'
const LOGIN_SUCCESS = 'LOGIN_SUCCESS'
const LOG_OUT = 'LOG_OUT'

export function createAction(type, payload) {	
	return Object.assign({}, {type}, payload)
}

export default { STORE_TOKEN, DELETE_TOKEN, CAS_LOGIN, SHIB_LOGIN, LOCAL_LOGIN, FACEBOOK_LOGIN, LOGIN_SUCCESS, LOG_OUT }