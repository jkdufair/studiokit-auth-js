import actions from '../actions'

export default function auth(state = {}, action) {
	switch (action.type) {
		case actions.LOGIN_SUCCESS:
			return Object.assign({}, state, {
				isAuthenticated: true
			})

		case actions.LOG_OUT:
			return Object.assign({}, state, {
				isAuthenticated: false
			})

		case actions.STORE_TOKEN:
			return Object.assign({}, state, {
				token: action.token
			})

		case actions.DELETE_TOKEN:
			return Object.assign({}, state, {
				token: null
			})

		default:
			return state
	}
}