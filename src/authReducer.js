import actions from './actions'

const initialState = {
	isInitialized: false,
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}

export default function authReducer(state = initialState, action) {
	switch (action.type) {
		case actions.GET_TOKEN_SUCCEEDED:
		case actions.TOKEN_REFRESH_SUCCEEDED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: true,
				didFail: false
			})

		case actions.LOGIN_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: true,
				isAuthenticated: false,
				didFail: false
			})

		case actions.LOG_OUT_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: false
			})

		case actions.LOGIN_FAILED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: true
			})

		case actions.AUTH_INITIALIZED:
			return Object.assign({}, state, { isInitialized: true })

		default:
			return state
	}
}
