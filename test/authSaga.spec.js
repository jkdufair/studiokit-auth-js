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
	select,
	all
} from 'redux-saga/effects'
import { createMockTask } from 'redux-saga/utils'
import { actions as netActions } from 'studiokit-net-js'

import {
	tokenPersistenceService as defaultTokenPersistenceService,
	ticketProviderService as defaultTicketProviderService,
	codeProviderService as defaultCodeProviderService
} from '../src/services'
import authSaga, { getOauthToken, __RewireAPI__ as AuthSagaRewireAPI } from '../src/authSaga'

const matchesModelFetchReceived = AuthSagaRewireAPI.__get__('matchesModelFetchReceived')
const takeMatchesModelFetchReceived = AuthSagaRewireAPI.__get__('takeMatchesModelFetchReceived')
const matchesModelFetchFailed = AuthSagaRewireAPI.__get__('matchesModelFetchFailed')
const takeMatchesModelFetchFailed = AuthSagaRewireAPI.__get__('takeMatchesModelFetchFailed')

const getTokenFromCode = AuthSagaRewireAPI.__get__('getTokenFromCode')
const getTokenFromRefreshToken = AuthSagaRewireAPI.__get__('getTokenFromRefreshToken')
const performTokenRefresh = AuthSagaRewireAPI.__get__('performTokenRefresh')

const loginFlow = AuthSagaRewireAPI.__get__('loginFlow')
const credentialsLoginFlow = AuthSagaRewireAPI.__get__('credentialsLoginFlow')
const casCredentialsLoginFlow = AuthSagaRewireAPI.__get__('casCredentialsLoginFlow')
const casV1LoginFlow = AuthSagaRewireAPI.__get__('casV1LoginFlow')
const casProxyLoginFlow = AuthSagaRewireAPI.__get__('casProxyLoginFlow')
const localLoginFlow = AuthSagaRewireAPI.__get__('localLoginFlow')
const casTicketLoginFlow = AuthSagaRewireAPI.__get__('casTicketLoginFlow')

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

describe('helpers', () => {
	test('matchesModelFetchReceived matches by modelName', () => {
		expect(
			matchesModelFetchReceived(
				{
					type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(true)
	})
	test('matchesModelFetchReceived ignores other actions for modelName', () => {
		expect(
			matchesModelFetchReceived(
				{
					type: netActions.FETCH_FAILED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('matchesModelFetchReceived ignores other modelNames', () => {
		expect(
			matchesModelFetchReceived(
				{
					type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
					modelName: 'someOtherModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('should call matchesModelFetchReceived from takeMatchesModelFetchReceived', () => {
		expect(
			takeMatchesModelFetchReceived('someModel')({
				type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
				modelName: 'someModel'
			})
		).toEqual(true)
	})

	test('matchesModelFetchFailed matches by modelName', () => {
		expect(
			matchesModelFetchFailed(
				{
					type: netActions.FETCH_FAILED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(true)
	})
	test('matchesModelFetchFailed ignores other actions for modelName', () => {
		expect(
			matchesModelFetchFailed(
				{
					type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('matchesModelFetchFailed ignores other modelNames', () => {
		expect(
			matchesModelFetchFailed(
				{
					type: netActions.FETCH_FAILED,
					modelName: 'someOtherModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('should call matchesModelFetchFailed from takeMatchesModelFetchFailed', () => {
		expect(
			takeMatchesModelFetchFailed('someModel')({
				type: netActions.FETCH_FAILED,
				modelName: 'someModel'
			})
		).toEqual(true)
	})
})

describe('getTokenFromCode', () => {
	let authSagaGen
	beforeEach(() => {
		authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(undefined)
	})

	test('should put DATA_REQUESTED with modelName and body string from clientCredentials and code', () => {
		const gen = getTokenFromCode('some-code')
		const putDataRequestedEffect = gen.next()
		expect(putDataRequestedEffect.value).toEqual(
			put(
				createAction(netActions.DATA_REQUESTED, {
					modelName: 'getToken',
					body: 'grant_type=authorization_code&client_id=test&client_secret=secret&code=some-code',
					noStore: true
				})
			)
		)
	})

	test('should return null and finish if fetch fails', () => {
		const gen = getTokenFromCode('some-code')
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchFailedEffect = gen.next({
			fetchFailed: {}
		})
		expect(fetchFailedEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return null and finish if fetch returns no data', () => {
		const gen = getTokenFromCode('some-code')
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {}
		})
		expect(fetchReceivedEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return null and finish if fetch returns and error', () => {
		const gen = getTokenFromCode('some-code')
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				data: {
					error: 'no soup for you'
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return data and finish if fetch returns successfully', () => {
		const gen = getTokenFromCode('some-code')
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				data: {
					foo: 'bar'
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual({
			foo: 'bar'
		})
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('getTokenFromRefreshToken', () => {
	let authSagaGen
	beforeEach(() => {
		authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(undefined)
	})

	test('should put DATA_REQUESTED with modelName and body string from clientCredentials and code', () => {
		const gen = getTokenFromRefreshToken({
			access_token: 'some-access-token',
			refresh_token: 'some-refresh-token'
		})
		const putDataRequestedEffect = gen.next()
		expect(putDataRequestedEffect.value).toEqual(
			put(
				createAction(netActions.DATA_REQUESTED, {
					modelName: 'getToken',
					body:
						'grant_type=refresh_token&client_id=test&client_secret=secret&refresh_token=some-refresh-token',
					noStore: true,
					timeLimit: 60000
				})
			)
		)
	})

	test('should signal logout, return null, and finish if fetch fails', () => {
		const gen = getTokenFromRefreshToken({
			access_token: 'some-access-token',
			refresh_token: 'some-refresh-token'
		})
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchFailedEffect = gen.next({
			fetchFailed: {}
		})
		expect(fetchFailedEffect.value).toEqual(
			all({
				logOut: put(createAction(actions.LOG_OUT_REQUESTED)),
				signalRefreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED))
			})
		)
		const allLogoutEffect = gen.next()
		expect(allLogoutEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should signal logout, return null, and finish if fetch returns no data', () => {
		const gen = getTokenFromRefreshToken({
			access_token: 'some-access-token',
			refresh_token: 'some-refresh-token'
		})
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {}
		})
		expect(fetchReceivedEffect.value).toEqual(
			all({
				logOut: put(createAction(actions.LOG_OUT_REQUESTED)),
				signalRefreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED))
			})
		)
		const allLogoutEffect = gen.next()
		expect(allLogoutEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should signal logout, return null, and finish if fetch returns and error', () => {
		const gen = getTokenFromRefreshToken({
			access_token: 'some-access-token',
			refresh_token: 'some-refresh-token'
		})
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				data: {
					error: 'no soup for you'
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual(
			all({
				logOut: put(createAction(actions.LOG_OUT_REQUESTED)),
				signalRefreshFailed: put(createAction(actions.TOKEN_REFRESH_FAILED))
			})
		)
		const allLogoutEffect = gen.next()
		expect(allLogoutEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return data and finish if fetch returns successfully', () => {
		const gen = getTokenFromRefreshToken({
			access_token: 'some-access-token',
			refresh_token: 'some-refresh-token'
		})
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				data: {
					foo: 'bar'
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual({
			foo: 'bar'
		})
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('performTokenRefresh', () => {
	let authSagaGen
	const oauthToken = {
		access_token: 'some-access-token'
	}
	beforeEach(() => {
		authSagaGen = authSaga(clientCredentials, defaultTokenPersistenceService)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)
	})

	test('should set refreshLock to true and call getTokenFromRefreshToken', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		expect(consoleOutput).toEqual('Refreshing OAuth token')
		const refreshLock = AuthSagaRewireAPI.__get__('refreshLock')
		expect(refreshLock).toEqual(true)
		expect(callGetTokenFromRefreshTokenEffect.value).toEqual(
			call(getTokenFromRefreshToken, oauthToken)
		)
		const allRefreshActions = gen.next(oauthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should finish and return if refreshLock is already true', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		consoleOutput = null

		const gen2 = performTokenRefresh()
		const sagaDone2 = gen2.next()
		expect(consoleOutput).toEqual(null)
		expect(sagaDone2.done).toEqual(true)

		const allRefreshActions = gen.next(oauthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should allow refresh again after first refresh is finished', () => {
		// first refresh - start
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		consoleOutput = null

		// second refresh - fails
		const gen2 = performTokenRefresh()
		const sagaDone2 = gen2.next()
		expect(consoleOutput).toEqual(null)
		expect(sagaDone2.done).toEqual(true)

		// first refresh - finish
		const allRefreshActions = gen.next(oauthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)

		// unlocked
		let refreshLock = AuthSagaRewireAPI.__get__('refreshLock')
		expect(refreshLock).toEqual(false)

		// third refresh - success
		const gen3 = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect3 = gen3.next()
		expect(consoleOutput).toEqual('Refreshing OAuth token')
		refreshLock = AuthSagaRewireAPI.__get__('refreshLock')
		expect(refreshLock).toEqual(true)
		expect(callGetTokenFromRefreshTokenEffect3.value).toEqual(
			call(getTokenFromRefreshToken, oauthToken)
		)
		const allRefreshActions3 = gen3.next(oauthToken)
		const sagaDone3 = gen3.next()
		expect(sagaDone3.done).toEqual(true)
	})

	test('should call all refresh actions', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		const allRefreshActions = gen.next(oauthToken)
		expect(allRefreshActions.value).toEqual(
			all({
				sendTokenForIntercept: put(createAction(actions.TOKEN_REFRESH_SUCCEEDED, { oauthToken })),
				persistToken: call(defaultTokenPersistenceService.persistToken, oauthToken)
			})
		)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('defaultTokenPersistenceService.persistToken should update token', () => {
		let currentToken = defaultTokenPersistenceService.getPersistedToken()
		expect(currentToken).toEqual(undefined)
		const token = {
			access_token: 'some-token'
		}
		defaultTokenPersistenceService.persistToken(token)
		currentToken = defaultTokenPersistenceService.getPersistedToken()
		expect(currentToken).toEqual(token)
	})
})

describe('loginFlow', () => {
	const credentials = {
		Username: 'username',
		Password: 'password'
	}
	const modelName = 'some-model'
	const actionPayload = {
		modelName,
		noStore: true,
		body: credentials,
		timeLimit: 120000
	}

	let authSagaGen
	beforeEach(() => {
		authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(undefined)
	})

	test('should put DATA_REQUESTED with modelName and actionPayload', () => {
		const gen = loginFlow(actionPayload, modelName)
		const putDataRequestedEffect = gen.next()
		expect(putDataRequestedEffect.value).toEqual(
			put(
				createAction(netActions.DATA_REQUESTED, {
					modelName: 'some-model',
					noStore: true,
					body: {
						Username: 'username',
						Password: 'password'
					},
					timeLimit: 120000
				})
			)
		)
	})

	test('should return null and finish if loginFailed', () => {
		const gen = loginFlow(actionPayload, modelName)
		const putDataRequestedEffect = gen.next()
		const raceFetchResultEffect = gen.next()
		const sagaDone = gen.next({
			fetchFailed: {
				type: netActions.FETCH_FAILED,
				modelName
			}
		})
		expect(sagaDone.value).toEqual(null)
		expect(sagaDone.done).toEqual(true)
	})

	test('should call getTokenFromCode if action.data.Code (capitalized) exists', () => {
		const gen = loginFlow(actionPayload, modelName)
		const putDataRequestedEffect = gen.next()
		const raceFetchResultEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
				modelName,
				data: { Code: 'some-code' }
			}
		})
		expect(fetchReceivedEffect.value).toEqual(call(getTokenFromCode, 'some-code'))
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should call getTokenFromCode if action.data.code (lowercase) exists', () => {
		const gen = loginFlow(actionPayload, modelName)
		const putDataRequestedEffect = gen.next()
		const raceFetchResultEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {
				type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
				modelName,
				data: { code: 'some-code' }
			}
		})
		expect(fetchReceivedEffect.value).toEqual(call(getTokenFromCode, 'some-code'))
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return null and finish if sucessful fetch result has no data', () => {
		const gen = loginFlow(actionPayload, modelName)
		const putDataRequestedEffect = gen.next()
		const raceFetchResultEffect = gen.next()
		const sagaDone = gen.next({
			fetchReceived: {
				type: netActions.TRANSIENT_FETCH_RESULT_RECEIVED,
				modelName
			}
		})
		expect(sagaDone.value).toEqual(null)
		expect(sagaDone.done).toEqual(true)
	})

	describe('casTicketLoginFlow', () => {
		test('should call loginFlow with given ticket and service as query params', () => {
			const gen = casTicketLoginFlow('some-ticket', 'some-service')
			const callLoginFlowEffect = gen.next()
			expect(callLoginFlowEffect.value).toEqual(
				call(
					loginFlow,
					{
						modelName: 'codeFromCasTicket',
						noStore: true,
						queryParams: {
							ticket: 'some-ticket',
							service: 'some-service'
						}
					},
					'codeFromCasTicket'
				)
			)
		})
	})

	describe('credentialsLoginFlow', () => {
		test('should call loginFlow with given credentials as body', () => {
			const gen = credentialsLoginFlow({ foo: 'bar' }, 'some-model')
			const callLoginFlowEffect = gen.next()
			expect(callLoginFlowEffect.value).toEqual(
				call(
					loginFlow,
					{
						modelName: 'some-model',
						noStore: true,
						body: { foo: 'bar' },
						timeLimit: 120000
					},
					'some-model'
				)
			)
		})
	})

	describe('casProxyLoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = casProxyLoginFlow({ foo: 'bar' })
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, { foo: 'bar' }, 'codeFromCasProxy')
			)
		})
	})

	describe('casV1LoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = casV1LoginFlow({ foo: 'bar' })
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, { foo: 'bar' }, 'codeFromCasV1')
			)
		})
	})

	describe('localLoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = localLoginFlow({ foo: 'bar' })
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, { foo: 'bar' }, 'codeFromLocalCredentials')
			)
		})
	})
})

describe('handleAuthFailure', () => {
	test('does nothing if authSaga has no token', () => {
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(undefined)

		const gen = handleAuthFailure({
			errorData: {
				code: 400
			}
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test("does nothing if authSaga's token is not expired", () => {
		let notExpiredDate = new Date()
		notExpiredDate.setMinutes(notExpiredDate.getMinutes() + 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': notExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = handleAuthFailure({
			errorData: {
				code: 400
			}
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('does nothing if error code is greater than 400-499', () => {
		let expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': expiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = handleAuthFailure({
			errorData: {
				code: 500
			}
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('does nothing if error code is less than than 400-499', () => {
		let expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': expiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = handleAuthFailure({
			errorData: {
				code: 302
			}
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('triggers refresh if token is expired and code is 400-499', () => {
		let expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': expiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = handleAuthFailure({
			errorData: {
				code: 400
			}
		})
		const callPerformTokenRefreshEffect = gen.next()
		expect(callPerformTokenRefreshEffect.value).toEqual(call(performTokenRefresh))
		expect(consoleOutput).toEqual('token expired - refreshing')
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('getOauthToken', () => {
	test('should return null if modelName equals "getToken"', () => {
		const gen = getOauthToken('getToken')
		const token = gen.next()
		expect(token.value).toEqual(null)
	})

	test('should return oauthToken if authSaga has one', () => {
		const oauthToken = { access_token: 'some-access-token' }
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOauthToken('someModelName')
		const token = gen.next()
		expect(token.value).toEqual(oauthToken)
	})

	test('should return oauthToken if has ".expires", but is not within 30 seconds of expiration', () => {
		let notExpiredDate = new Date()
		notExpiredDate.setMinutes(notExpiredDate.getMinutes() + 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': notExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOauthToken('someModelName')
		const token = gen.next()
		expect(token.value).toEqual(oauthToken)
	})

	test('should trigger refresh of oauthToken if has ".expires" and is expired', () => {
		let expiresNowDate = new Date()
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': expiresNowDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOauthToken('someModelName')
		const allRefreshEffect = gen.next()
		expect(allRefreshEffect.value).toEqual(
			all([call(performTokenRefresh), take(actions.TOKEN_REFRESH_SUCCEEDED)])
		)
	})

	test('should trigger refresh of oauthToken if has ".expires" and is within 30 seconds of expiration', () => {
		let almostExpiredDate = new Date()
		almostExpiredDate.setSeconds(almostExpiredDate.getSeconds() + 15)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': almostExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOauthToken('someModelName')
		const allRefreshEffect = gen.next()
		expect(allRefreshEffect.value).toEqual(
			all([call(performTokenRefresh), take(actions.TOKEN_REFRESH_SUCCEEDED)])
		)
	})

	test('should return oauthToken after performing a refresh', () => {
		let almostExpiredDate = new Date()
		almostExpiredDate.setSeconds(almostExpiredDate.getSeconds() + 15)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': almostExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOauthToken('someModelName')
		const allRefreshEffect = gen.next()
		const tokenEffect = gen.next()
		expect(tokenEffect.value).toEqual(oauthToken)
	})
})

describe('authSaga', () => {
	describe('init', () => {
		test('should throw without clientCredentialsParam', () => {
			const gen = authSaga()
			expect(() => {
				const callGetPersistedTokenEffect = gen.next()
			}).toThrow(/'clientCredentialsParam' is required for authSaga/)
		})

		test('should use default logger', () => {
			const gen = authSaga(clientCredentials)
			const callGetPersistedTokenEffect = gen.next()
			expect(consoleOutput).toEqual('logger set to defaultLogger')
		})

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
			const putAuthInitializedEffect = gen.next()
			expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
		})

		test('defaultTokenPersistenceService.getPersistedToken does not return a token', () => {
			const gen = authSaga(clientCredentials, defaultTokenPersistenceService)
			const callGetPersistedTokenEffect = gen.next()
			expect(callGetPersistedTokenEffect.value).toEqual(
				call(defaultTokenPersistenceService.getPersistedToken)
			)
			const putAuthInitializedEffect = gen.next(defaultTokenPersistenceService.getPersistedToken())
			expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
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
				const putAuthInitializedEffect = gen.next()
				expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
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
				const putAuthInitializedEffect = gen.next()
				expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
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
				const putAuthInitializedEffect = gen.next()
				expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
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
				const putAuthInitializedEffect = gen.next()
				expect(putAuthInitializedEffect.value).toEqual(put(createAction(actions.AUTH_INITIALIZED)))
			})
		})
		describe('init auth error handling', () => {
			test('takeEvery failure to handleAuthFailure', () => {
				const gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(undefined)
				const takeEveryFetchFailureEffect = gen.next()
				expect(takeEveryFetchFailureEffect.value).toEqual(
					takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)
				)
			})
		})
	})

	describe('run loop', () => {
		describe('no oauthToken', () => {
			const payload = {
				Username: 'username',
				Password: 'password'
			}
			let gen
			beforeEach(() => {
				gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(undefined)
				const takeEveryFetchFailureEffect = gen.next()
			})

			test('race condition for login actions', () => {
				const raceLoginActionEffect = gen.next()
				expect(raceLoginActionEffect.value).toEqual(
					race({
						casV1Action: take(actions.CAS_V1_LOGIN_REQUESTED),
						casProxyAction: take(actions.CAS_PROXY_LOGIN_REQUESTED),
						localAction: take(actions.LOCAL_LOGIN_REQUESTED)
					})
				)
			})

			test('puts LOGIN_REQUESTED after race resolves', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: {
						payload
					},
					casProxyAction: null,
					localAction: null
				})
				expect(putLoginRequestedEffect.value).toEqual(put(createAction(actions.LOGIN_REQUESTED)))
			})

			test('calls casV1Action if won race', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: {
						payload
					},
					casProxyAction: null,
					localAction: null
				})
				const callActionEffect = gen.next()
				expect(callActionEffect.value).toEqual(call(casV1LoginFlow, payload))
			})

			test('calls casProxyLoginFlow if won race', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: null,
					casProxyAction: {
						payload
					},
					localAction: null
				})
				const callActionEffect = gen.next()
				expect(callActionEffect.value).toEqual(call(casProxyLoginFlow, payload))
			})

			test('calls localLoginFlow if won race', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: null,
					casProxyAction: null,
					localAction: {
						payload
					}
				})
				const callActionEffect = gen.next()
				expect(callActionEffect.value).toEqual(call(localLoginFlow, payload))
			})

			test('triggers all login effects after completing login flow', () => {
				const oauthToken = { access_token: 'some-access-token' }
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: {
						payload
					},
					casProxyAction: null,
					localAction: null
				})
				const callActionEffect = gen.next()
				const allLoginSuccessEffect = gen.next(oauthToken)
				expect(allLoginSuccessEffect.value).toEqual(
					all({
						loginSuccess: put(createAction(actions.GET_TOKEN_SUCCEEDED, { oauthToken })),
						persistToken: call(defaultTokenPersistenceService.persistToken, oauthToken),
						getUserInfo: put(
							createAction(netActions.DATA_REQUESTED, { modelName: 'user.userInfo' })
						),
						logOut: take(actions.LOG_OUT_REQUESTED)
					})
				)
			})

			test('puts LOGIN_FAILED if race condition fail', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					// no success
				})
				const putLoginFailedEffect = gen.next(undefined)
				expect(putLoginFailedEffect.value).toEqual(put(createAction(actions.LOGIN_FAILED)))
			})

			test('puts LOGIN_FAILED if no token after race condition success but login flow fail', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: {
						payload
					},
					casProxyAction: null,
					localAction: null
				})
				const callActionEffect = gen.next()
				const putLoginFailedEffect = gen.next(undefined)
				expect(putLoginFailedEffect.value).toEqual(put(createAction(actions.LOGIN_FAILED)))
			})
		})

		describe('with oauthToken', () => {
			const oauthToken = { access_token: 'some-access-token' }
			let gen
			beforeEach(() => {
				gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(oauthToken)
				const takeEveryFetchFailureEffect = gen.next()
			})

			test('triggers all login effects after loading oauthToken', () => {
				const allLoginSuccessEffect = gen.next()
				expect(allLoginSuccessEffect.value).toEqual(
					all({
						loginSuccess: put(createAction(actions.GET_TOKEN_SUCCEEDED, { oauthToken })),
						persistToken: call(defaultTokenPersistenceService.persistToken, oauthToken),
						getUserInfo: put(
							createAction(netActions.DATA_REQUESTED, { modelName: 'user.userInfo' })
						),
						logOut: take(actions.LOG_OUT_REQUESTED)
					})
				)
			})
		})

		describe('LOG_OUT_REQUESTED', () => {
			const oauthToken = { access_token: 'some-access-token' }
			let gen
			beforeEach(() => {
				gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(oauthToken)
				const takeEveryFetchFailureEffect = gen.next()
			})

			test('clears user data after log out requested, and restarts loop back to race effect', () => {
				const allLoginSuccessEffect = gen.next()
				const allClearDataEffect = gen.next()
				expect(allClearDataEffect.value).toEqual(
					all({
						clearUserData: put(
							createAction(netActions.KEY_REMOVAL_REQUESTED, { modelName: 'user' })
						),
						clearPersistentToken: call(defaultTokenPersistenceService.persistToken, null)
					})
				)
				const raceLoginActionEffect = gen.next()
				expect(raceLoginActionEffect.value).toEqual(
					race({
						casV1Action: take(actions.CAS_V1_LOGIN_REQUESTED),
						casProxyAction: take(actions.CAS_PROXY_LOGIN_REQUESTED),
						localAction: take(actions.LOCAL_LOGIN_REQUESTED)
					})
				)
			})
		})
	})
})
