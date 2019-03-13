import { AUTH_ACTION, createAction } from './actions'

describe('createAction', () => {
	it('creates a basic action', () => {
		const action = createAction(AUTH_ACTION.LOGIN_REQUESTED, { foo: 'bar' })
		expect(action).toEqual({ type: AUTH_ACTION.LOGIN_REQUESTED, foo: 'bar' })
	})
})
