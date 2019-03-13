import { AUTH_ACTION } from './actions'
import { AuthAction } from './types'

const initialState = {
	isInitialized: false,
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}

export default function authReducer(state = initialState, action: AuthAction) {
	switch (action.type) {
		case AUTH_ACTION.AUTH_INITIALIZED:
			return Object.assign({}, state, {
				isInitialized: true,
				isAuthenticated: !!action.oauthToken
			})

		case AUTH_ACTION.GET_TOKEN_SUCCEEDED:
		case AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: true,
				didFail: false
			})

		case AUTH_ACTION.LOGIN_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: true,
				isAuthenticated: false,
				didFail: false
			})

		case AUTH_ACTION.LOG_OUT_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: false
			})

		case AUTH_ACTION.LOGIN_FAILED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: true
			})

		default:
			return state
	}
}
