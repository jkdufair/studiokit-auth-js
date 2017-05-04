import actions from '../actions'

export default function auth(state = {}, action) {
	switch (action.type) {
		case actions.LOGIN_SUCCEEDED:
			return Object.assign({}, state, {
				isAuthenticated: true
			})

		case actions.LOG_OUT_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticated: false
			})

		default:
			return state
	}
}