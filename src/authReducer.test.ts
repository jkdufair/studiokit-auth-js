import AUTH_ACTION from './actions'
import authReducer from './authReducer'

const initialState = {
	isInitialized: false,
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}

describe('authReducer', () => {
	describe('default action', () => {
		test("don't do nada", () => {
			const state = authReducer(initialState, {
				type: AUTH_ACTION.CAS_LOGIN_REQUESTED
			})
			expect(state).toEqual(initialState)
		})

		test('no state parameter passed', () => {
			const state = authReducer(undefined, { type: AUTH_ACTION.AUTH_INITIALIZED })
			expect(state).toEqual({
				isInitialized: true,
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: false
			})
		})
	})

	describe('GET_TOKEN_SUCCEEDED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.GET_TOKEN_SUCCEEDED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: true,
			didFail: false
		})
	})

	describe('TOKEN_REFRESH_SUCCEEDED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: true,
			didFail: false
		})
	})

	describe('LOGIN_REQUESTED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.LOGIN_REQUESTED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: true,
			isAuthenticated: false,
			didFail: false
		})
	})

	describe('LOG_OUT_REQUESTED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.LOG_OUT_REQUESTED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: false
		})
	})

	describe('LOGIN_FAILED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.LOGIN_FAILED })
		expect(state).toEqual({
			isInitialized: false,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: true
		})
	})

	describe('AUTH_INITIALIZED', () => {
		const state = authReducer(initialState, { type: AUTH_ACTION.AUTH_INITIALIZED })
		expect(state).toEqual({
			isInitialized: true,
			isAuthenticating: false,
			isAuthenticated: false,
			didFail: false
		})
	})
})
