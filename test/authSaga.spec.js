import actions, { createAction } from '../src/actions'
import { delay } from 'redux-saga'
import {
	call,
	cancel,
	cancelled,
	take,
	takeEvery,
	takeLatest,
	fork,
	put,
	race,
	select
} from 'redux-saga/effects'
import { createMockTask } from 'redux-saga/utils'
import { actions as netActions } from 'studiokit-net-js'

import {
	tokenPersistenceService as defaultTokenPersistenceService,
	ticketProviderService as defaultTicketProviderService,
	codeProviderService as defaultCodeProviderService
} from '../src/services'
import authSaga, { __RewireAPI__ as AuthSagaRewireAPI } from '../src/authSaga'

const casTicketLoginFlow = AuthSagaRewireAPI.__get__('casTicketLoginFlow')
const getTokenFromCode = AuthSagaRewireAPI.__get__('getTokenFromCode')
const handleAuthFailure = AuthSagaRewireAPI.__get__('handleAuthFailure')

let consoleOutput
const _consoleLog = console.debug

beforeAll(() => {
	console.debug = jest.fn(message => {
		consoleOutput = message
	})
})

afterAll(() => {
	console.debug = _consoleLog
})

const clientCredentials = { client_id: 'test', client_secret: 'secret' }

describe('authSaga', () => {
	test('should throw without clientCredentialsParam', () => {
		const gen = authSaga()
		expect(() => {
			gen.next()
		}).toThrow(/'clientCredentialsParam' is required for authSaga/)
	})

	test('should use default logger', () => {
		const gen = authSaga(clientCredentials)
		gen.next()
		expect(consoleOutput).toEqual('logger set to defaultLogger')
	})

	describe('init', () => {
		test('calls tokenPersistenceService.getPersistedToken to load oauthToken', () => {
			let storedToken = { access_token: 'some-access-token' }
			const tokenPersistenceService = {
				getPersistedToken: () => {
					return storedToken
				},
				persistToken: token => {
					storedToken = token
				}
			}
			const gen = authSaga(clientCredentials, tokenPersistenceService)
			const callGetPersistedTokenEffect = gen.next()
			expect(callGetPersistedTokenEffect.value).toEqual(
				call(tokenPersistenceService.getPersistedToken)
			)
			const authInitializedEffect = gen.next()
			expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
		})

		test('defaultTokenPersistenceService.getPersistedToken does not return a token', () => {
			const gen = authSaga(clientCredentials, defaultTokenPersistenceService)
			const callGetPersistedTokenEffect = gen.next()
			expect(callGetPersistedTokenEffect.value).toEqual(
				call(defaultTokenPersistenceService.getPersistedToken)
			)
			const authInitializedEffect = gen.next(defaultTokenPersistenceService.getPersistedToken())
			expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
		})

		describe('with no oauthToken, casTicket init', () => {
			test('calls casTicketLoginFlow if ticketProviderService returns a ticket, then removes the ticket', () => {
				let didRemoveTicket = false
				const ticketProviderService = {
					getTicket: () => 'some-ticket',
					getAppServiceName: () => 'http://localhost:3000/',
					removeTicket: () => {
						didRemoveTicket = true
					}
				}
				const gen = authSaga(
					clientCredentials,
					defaultTokenPersistenceService,
					ticketProviderService
				)
				const callGetPersistedTokenEffect = gen.next()
				const casTicketLoginFlowEffect = gen.next()
				expect(casTicketLoginFlowEffect.value).toEqual(
					call(casTicketLoginFlow, 'some-ticket', 'http://localhost:3000/')
				)
				expect(didRemoveTicket).toEqual(true)
				const authInitializedEffect = gen.next()
				expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
			})

			test('does not call casTicketLoginFlow if ticketProviderService does not return a ticket', () => {
				let didRemoveTicket = false
				const ticketProviderService = {
					getTicket: () => undefined,
					getAppServiceName: () => 'http://localhost:3000/',
					removeTicket: () => {
						didRemoveTicket = true
					}
				}
				const gen = authSaga(
					clientCredentials,
					defaultTokenPersistenceService,
					ticketProviderService
				)
				const callGetPersistedTokenEffect = gen.next()
				const authInitializedEffect = gen.next()
				expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
			})
		})

		describe('with no oauthToken, no casTicket, code init', () => {
			test('calls getTokenFromCode if codeProviderService returns a code, then removes the code', () => {
				let didRemoveCode = false
				const codeProviderService = {
					getCode: () => 'some-code',
					removeCode: () => {
						didRemoveCode = true
					}
				}
				const gen = authSaga(
					clientCredentials,
					defaultTokenPersistenceService,
					defaultTicketProviderService,
					codeProviderService
				)
				const callGetPersistedTokenEffect = gen.next()
				const codeLoginFlowEffect = gen.next()
				expect(codeLoginFlowEffect.value).toEqual(call(getTokenFromCode, 'some-code'))
				expect(didRemoveCode).toEqual(true)
				const authInitializedEffect = gen.next()
				expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
			})

			test('does not call getTokenFromCode if codeProviderService does not return a code', () => {
				let didRemoveCode = false
				const codeProviderService = {
					getCode: () => undefined,
					removeCode: () => {
						didRemoveCode = true
					}
				}
				const gen = authSaga(
					clientCredentials,
					defaultTokenPersistenceService,
					defaultTicketProviderService,
					codeProviderService
				)
				const callGetPersistedTokenEffect = gen.next()
				const authInitializedEffect = gen.next()
				expect(authInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
			})
		})
	})

	test('takeEvery failure to handleAuthFailure', () => {
		const gen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = gen.next()
		const authInitializedEffect = gen.next(undefined)
		const takeEveryFetchFailureEffect = gen.next()
		expect(takeEveryFetchFailureEffect.value).toEqual(
			takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)
		)
	})
})
