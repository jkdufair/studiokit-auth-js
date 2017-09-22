import { createAction } from '../lib/actions'

describe('actions', () => {
	test('createAction', () => {
		const action = createAction('aType', { foo: 'bar' })
		expect(action).toEqual({ type: 'aType', foo: 'bar' })
	})
})
