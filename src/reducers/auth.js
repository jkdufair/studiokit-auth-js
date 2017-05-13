import actions from '../actions'

const initialState = {
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}

export default function auth(state = initialState, action) {
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

		default:
			return state
	}
}