import authReducer from '../src/authReducer'
import actions from '../src/actions'

const initialState = {
	isInitialized: false,
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}

describe('authReducer', () => {
	describe('default action', () => {
		test("don't do nada", () => {
			const state = authReducer(initialState, { type: 'FOOBAR', modelName: 'test' })
			expect(state).toEqual(initialState)
		})

		test('no state parameter passed', () => {
			const state = authReducer(undefined, { type: actions.AUTH_INITIALIZED })
			expect(state).toEqual({
				isInitialized: true,
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: false
			})
		})
	})

	describe('GET_TOKEN_SUCCEEDED', () => {
		const state = authReducer(initialState, { type: actions.GET_TOKEN_SUCCEEDED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: true,
			didFail: false
		})
	})

	describe('TOKEN_REFRESH_SUCCEEDED', () => {
		const state = authReducer(initialState, { type: actions.TOKEN_REFRESH_SUCCEEDED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: true,
			didFail: false
		})
	})

	describe('LOGIN_REQUESTED', () => {
		const state = authReducer(initialState, { type: actions.LOGIN_REQUESTED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: true,
			isAuthenticated: false,
			didFail: false
		})
	})

	describe('LOG_OUT_REQUESTED', () => {
		const state = authReducer(initialState, { type: actions.LOG_OUT_REQUESTED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: false
		})
	})

	describe('LOGIN_FAILED', () => {
		const state = authReducer(initialState, { type: actions.LOGIN_FAILED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: true
		})
	})

	describe('AUTH_INITIALIZED', () => {
		const state = authReducer(initialState, { type: actions.AUTH_INITIALIZED })
		expect(state).toEqual({
			isInitialized: true,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: false
		})
	})
})
