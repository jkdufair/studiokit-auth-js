import { SagaIterator } from '@redux-saga/core'
import { all, call, put, race, take, takeEvery } from 'redux-saga/effects'
import { NET_ACTION, OAuthToken } from 'studiokit-net-js'

import { AUTH_ACTION, createAction } from './actions'
import authSaga, {
	casProxyLoginFlow,
	casTicketLoginFlow,
	casV1LoginFlow,
	credentialsLoginFlow,
	getOAuthToken,
	getTokenFromCode,
	getTokenFromRefreshToken,
	handleAuthFailure,
	localLoginFlow,
	loginFlow,
	matchesModelFetchFailed,
	matchesModelFetchReceived,
	performTokenRefresh,
	takeMatchesModelFetchFailed,
	takeMatchesModelFetchReceived,
	takeMatchesTokenRefreshFailed,
	takeMatchesTokenRefreshSucceeded
} from './authSaga'
import {
	ticketProviderService as defaultTicketProviderService,
	tokenPersistenceService as defaultTokenPersistenceService
} from './services'
import { Credentials, TokenPersistenceService } from './types'

let consoleOutput: any
const consoleDebug = console.debug

beforeAll(() => {
	console.debug = jest.fn(message => {
		consoleOutput = message
	})
})

afterAll(() => {
	console.debug = consoleDebug
})

const clientCredentials = { client_id: 'test', client_secret: 'secret' }

const sampleOAuthToken: OAuthToken = {
	access_token: 'some-access-token',
	refresh_token: 'some-refresh-token',
	client_id: 'web',
	token_type: 'Bearer',
	expires_in: 3600,
	'.expires': '2019-01-02',
	'.issued': '2019-01-01'
}

const sampleCredentials: Credentials = {
	Username: 'some-user',
	Password: '*****'
}

describe('helpers', () => {
	test('matchesModelFetchReceived matches by modelName', () => {
		expect(
			matchesModelFetchReceived(
				{
					type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(true)
	})
	test('matchesModelFetchReceived ignores other AUTH_ACTION.for modelName', () => {
		expect(
			matchesModelFetchReceived(
				{
					type: NET_ACTION.TRANSIENT_FETCH_FAILED,
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
					type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
					modelName: 'someOtherModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('should call matchesModelFetchReceived from takeMatchesModelFetchReceived', () => {
		expect(
			takeMatchesModelFetchReceived('someModel')({
				type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
				modelName: 'someModel'
			})
		).toEqual(true)
	})

	test('matchesModelFetchFailed matches by modelName', () => {
		expect(
			matchesModelFetchFailed(
				{
					type: NET_ACTION.TRANSIENT_FETCH_FAILED,
					modelName: 'someModel'
				},
				'someModel'
			)
		).toEqual(true)
	})
	test('matchesModelFetchFailed ignores other AUTH_ACTION.for modelName', () => {
		expect(
			matchesModelFetchFailed(
				{
					type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
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
					type: NET_ACTION.TRANSIENT_FETCH_FAILED,
					modelName: 'someOtherModel'
				},
				'someModel'
			)
		).toEqual(false)
	})
	test('should call matchesModelFetchFailed from takeMatchesModelFetchFailed', () => {
		expect(
			takeMatchesModelFetchFailed('someModel')({
				type: NET_ACTION.TRANSIENT_FETCH_FAILED,
				modelName: 'someModel'
			})
		).toEqual(true)
	})
	test('should call matchesTokenRefreshSucceeded from takeMatchesTokenRefreshSucceeded', () => {
		expect(
			takeMatchesTokenRefreshSucceeded()({
				type: AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED
			})
		).toEqual(true)
	})
	test('should call matchesTokenRefreshFailed from takeMatchesTokenRefreshFailed', () => {
		expect(
			takeMatchesTokenRefreshFailed()({
				type: AUTH_ACTION.TOKEN_REFRESH_FAILED
			})
		).toEqual(true)
	})
})

describe('getTokenFromCode', () => {
	let authSagaGen: SagaIterator
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
				createAction(NET_ACTION.DATA_REQUESTED, {
					modelName: 'getToken',
					body:
						'grant_type=authorization_code&client_id=test&client_secret=secret&code=some-code',
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
	let authSagaGen: SagaIterator
	beforeEach(() => {
		authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(undefined)
	})

	test('should put DATA_REQUESTED with modelName and body string from clientCredentials and code', () => {
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
		const putDataRequestedEffect = gen.next()
		expect(putDataRequestedEffect.value).toEqual(
			put(
				createAction(NET_ACTION.DATA_REQUESTED, {
					modelName: 'getToken',
					body:
						'grant_type=refresh_token&client_id=test&client_secret=secret&refresh_token=some-refresh-token',
					noStore: true,
					timeLimit: 60000
				})
			)
		)
	})

	test('should return null and finish if fetch fails', () => {
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
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
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchReceived: {}
		})
		expect(fetchReceivedEffect.value).toEqual(null)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return data and finish if fetch returns successfully', () => {
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
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

	test('should return original oauthToken if fetch fails with a time out', () => {
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchFailed: {
				errorData: {
					didTimeOut: true
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return original oauthToken if fetch fails with a server error', () => {
		const gen = getTokenFromRefreshToken(sampleOAuthToken)
		const putDataRequestedEffect = gen.next()
		const raceFetchEffect = gen.next()
		const fetchReceivedEffect = gen.next({
			fetchFailed: {
				errorData: {
					code: 500
				}
			}
		})
		expect(fetchReceivedEffect.value).toEqual(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('performTokenRefresh', () => {
	let authSagaGen: SagaIterator
	beforeEach(() => {
		defaultTokenPersistenceService.persistToken(null)
		authSagaGen = authSaga(clientCredentials, defaultTokenPersistenceService)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(sampleOAuthToken)
	})

	test('should set refreshLock to true and call getTokenFromRefreshToken', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		expect(consoleOutput).toEqual('Refreshing OAuth token')
		// locked
		expect(callGetTokenFromRefreshTokenEffect.value).toEqual(
			call(getTokenFromRefreshToken, sampleOAuthToken)
		)
		const allSuccessActions = gen.next(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should return race condition if refreshLock is already true', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		consoleOutput = null

		const gen2 = performTokenRefresh()
		const raceEffect = gen2.next()
		expect(consoleOutput).toEqual(null)

		// anonymous function comparison seems to break this test, possibly from ts-jest
		// expect(raceEffect.value).toEqual(
		// 	race({
		// 		refreshSuccess: take(takeMatchesTokenRefreshSucceeded()),
		// 		refreshFailed: take(takeMatchesTokenRefreshFailed()),
		// 	})
		// )

		const allSuccessActions = gen.next(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)

		const saga2Done = gen2.next()
		expect(saga2Done.done).toEqual(true)
	})

	test('should allow refresh again after first refresh is finished', () => {
		// first refresh - start
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		consoleOutput = null

		// first refresh - finish
		const allSuccessActions = gen.next(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)

		// unlocked

		// second refresh - success
		const gen2 = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect2 = gen2.next()
		expect(consoleOutput).toEqual('Refreshing OAuth token')
		expect(callGetTokenFromRefreshTokenEffect2.value).toEqual(
			call(getTokenFromRefreshToken, sampleOAuthToken)
		)
		const allSuccessActions2 = gen2.next(sampleOAuthToken)
		const sagaDone2 = gen2.next()
		expect(sagaDone2.done).toEqual(true)
	})

	test('should call all success AUTH_ACTION.if refresh succeeds', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		const newAccessToken = {
			...sampleOAuthToken,
			...{
				access_token: 'some-new-token'
			}
		}
		const callPersistTokenEffect = gen.next(newAccessToken)
		expect(callPersistTokenEffect.value).toEqual(
			call(defaultTokenPersistenceService.persistToken, newAccessToken)
		)
		const putRefreshSuccessEffect = gen.next()
		expect(putRefreshSuccessEffect.value).toEqual(
			put(createAction(AUTH_ACTION.TOKEN_REFRESH_SUCCEEDED, { oauthToken: newAccessToken }))
		)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should not change oauthToken if it did not change due to failure', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		const allSuccessActions = gen.next(sampleOAuthToken)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should call all failure AUTH_ACTION.if refresh fails', () => {
		const gen = performTokenRefresh()
		const callGetTokenFromRefreshTokenEffect = gen.next()
		const allFailureActions = gen.next(null)
		expect(consoleOutput).toEqual('OAuth token failed to refresh')
		expect(allFailureActions.value).toEqual(
			all({
				refreshFailed: put(createAction(AUTH_ACTION.TOKEN_REFRESH_FAILED)),
				logOut: put(createAction(AUTH_ACTION.LOG_OUT_REQUESTED))
			})
		)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('defaultTokenPersistenceService.persistToken should update token', () => {
		let currentToken = defaultTokenPersistenceService.getPersistedToken()
		expect(currentToken).toEqual(null)
		defaultTokenPersistenceService.persistToken(sampleOAuthToken)
		currentToken = defaultTokenPersistenceService.getPersistedToken()
		expect(currentToken).toEqual(sampleOAuthToken)
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

	let authSagaGen: SagaIterator
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
				createAction(NET_ACTION.DATA_REQUESTED, {
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
				type: NET_ACTION.FETCH_FAILED,
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
				type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
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
				type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
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
				type: NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED,
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
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})
	})

	describe('credentialsLoginFlow', () => {
		test('should call loginFlow with given credentials as body', () => {
			const gen = credentialsLoginFlow(sampleCredentials, 'some-model')
			const callLoginFlowEffect = gen.next()
			expect(callLoginFlowEffect.value).toEqual(
				call(
					loginFlow,
					{
						modelName: 'some-model',
						noStore: true,
						body: sampleCredentials,
						timeLimit: 120000
					},
					'some-model'
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})
	})

	describe('casProxyLoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = casProxyLoginFlow(sampleCredentials)
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, sampleCredentials, 'codeFromCasProxy')
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})
	})

	describe('casV1LoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = casV1LoginFlow(sampleCredentials)
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, sampleCredentials, 'codeFromCasV1')
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})
	})

	describe('localLoginFlow', () => {
		test('should call credentialsLoginFlow with given credentials', () => {
			const gen = localLoginFlow(sampleCredentials)
			const callCredentialsLoginFlowEffect = gen.next()
			expect(callCredentialsLoginFlowEffect.value).toEqual(
				call(credentialsLoginFlow, sampleCredentials, 'codeFromLocalCredentials')
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
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

	test('does nothing if error code is greater than 400-499', () => {
		const expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			...sampleOAuthToken,
			...{
				access_token: 'some-access-token',
				'.expires': expiredDate.toISOString()
			}
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
		const expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			...sampleOAuthToken,
			...{
				access_token: 'some-access-token',
				'.expires': expiredDate.toISOString()
			}
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
		const expiredDate = new Date()
		expiredDate.setMinutes(expiredDate.getMinutes() - 1)
		const oauthToken = {
			...sampleOAuthToken,
			...{
				access_token: 'some-access-token',
				'.expires': expiredDate.toISOString()
			}
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

describe('getOAuthToken', () => {
	test('should return null if modelName equals "getToken"', () => {
		const gen = getOAuthToken('getToken')
		const token = gen.next()
		expect(token.value).toEqual(null)
	})

	test('should return oauthToken if authSaga has one', () => {
		const oauthToken = { access_token: 'some-access-token' }
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOAuthToken('someModelName')
		const token = gen.next()
		expect(token.value).toEqual(oauthToken)
	})

	test('should return oauthToken if has ".expires", but is not within 30 seconds of expiration', () => {
		const notExpiredDate = new Date()
		notExpiredDate.setMinutes(notExpiredDate.getMinutes() + 1)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': notExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOAuthToken('someModelName')
		const token = gen.next()
		expect(token.value).toEqual(oauthToken)
	})

	test('should trigger refresh of oauthToken if has ".expires" and is expired', () => {
		const expiresNowDate = new Date()
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': expiresNowDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOAuthToken('someModelName')
		const callPerformRefreshEffect = gen.next()
		expect(callPerformRefreshEffect.value).toEqual(call(performTokenRefresh))
	})

	test('should trigger refresh of oauthToken if has ".expires" and is within 30 seconds of expiration', () => {
		const almostExpiredDate = new Date()
		almostExpiredDate.setSeconds(almostExpiredDate.getSeconds() + 15)
		const oauthToken = {
			access_token: 'some-access-token',
			'.expires': almostExpiredDate.toISOString()
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOAuthToken('someModelName')
		const callPerformRefreshEffect = gen.next()
		expect(callPerformRefreshEffect.value).toEqual(call(performTokenRefresh))
	})

	test('should return token if refresh succeeds', () => {
		const almostExpiredDate = new Date()
		almostExpiredDate.setSeconds(almostExpiredDate.getSeconds() + 15)
		const oauthToken = {
			...sampleOAuthToken,
			...{
				access_token: 'some-access-token',
				'.expires': almostExpiredDate.toISOString()
			}
		}
		const authSagaGen = authSaga(clientCredentials)
		const callGetPersistedTokenEffect = authSagaGen.next()
		const putAuthInitializedEffect = authSagaGen.next(oauthToken)

		const gen = getOAuthToken('someModelName')
		const callPerformRefreshEffect = gen.next()
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(oauthToken)
		expect(sagaDone.done).toEqual(true)
	})
})

describe('authSaga', () => {
	beforeEach(() => {
		defaultTokenPersistenceService.persistToken(null)
	})
	describe('init', () => {
		test('should use default logger', () => {
			const gen = authSaga(clientCredentials)
			const callGetPersistedTokenEffect = gen.next()
			expect(consoleOutput).toEqual('logger set to defaultLogger')
		})

		test('should use custom logger', () => {
			let customOutput: string = ''
			const customLogger = (message: string) => {
				customOutput = message
			}
			const gen = authSaga(clientCredentials, undefined, undefined, undefined, customLogger)
			gen.next()
			expect(customOutput).toEqual('logger set to customLogger')
		})

		test('calls tokenPersistenceService.getPersistedToken to load oauthToken', () => {
			let storedToken: OAuthToken | null = sampleOAuthToken
			const tokenPersistenceService: TokenPersistenceService = {
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
			const putAuthInitializedEffect = gen.next(storedToken)
			expect(putAuthInitializedEffect.value).toEqual(
				put(createAction(AUTH_ACTION.AUTH_INITIALIZED, { oauthToken: storedToken }))
			)
		})

		test('defaultTokenPersistenceService.getPersistedToken does not return a token', () => {
			const gen = authSaga(clientCredentials, defaultTokenPersistenceService)
			const callGetPersistedTokenEffect = gen.next()
			expect(callGetPersistedTokenEffect.value).toEqual(
				call(defaultTokenPersistenceService.getPersistedToken)
			)
			const putAuthInitializedEffect = gen.next(
				defaultTokenPersistenceService.getPersistedToken()
			)
			expect(putAuthInitializedEffect.value).toEqual(
				put(createAction(AUTH_ACTION.AUTH_INITIALIZED, { oauthToken: null }))
			)
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
				expect(putAuthInitializedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.AUTH_INITIALIZED))
				)
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
				expect(putAuthInitializedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.AUTH_INITIALIZED))
				)
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
				expect(putAuthInitializedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.AUTH_INITIALIZED))
				)
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
				expect(putAuthInitializedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.AUTH_INITIALIZED))
				)
			})
		})
		describe('init auth error handling', () => {
			test('takeEvery failure to handleAuthFailure', () => {
				const gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(undefined)
				const takeEveryFetchFailureEffect = gen.next()
				expect(takeEveryFetchFailureEffect.value).toEqual(
					takeEvery(NET_ACTION.TRY_FETCH_FAILED, handleAuthFailure)
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
			let gen: SagaIterator
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
						casV1Action: take(AUTH_ACTION.CAS_V1_LOGIN_REQUESTED),
						casProxyAction: take(AUTH_ACTION.CAS_PROXY_LOGIN_REQUESTED),
						localAction: take(AUTH_ACTION.LOCAL_LOGIN_REQUESTED)
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
				expect(putLoginRequestedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.LOGIN_REQUESTED))
				)
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
				const callPersistTokenEffect = gen.next(sampleOAuthToken)
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
				const callPersistTokenEffect = gen.next(sampleOAuthToken)
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
				const callPersistTokenEffect = gen.next(sampleOAuthToken)
			})

			test('triggers all login effects after completing login flow', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					casV1Action: {
						payload
					},
					casProxyAction: null,
					localAction: null
				})
				const callActionEffect = gen.next()
				const callPersistTokenEffect = gen.next(sampleOAuthToken)
				expect(callPersistTokenEffect.value).toEqual(
					call(defaultTokenPersistenceService.persistToken, sampleOAuthToken)
				)
				const allLoginSuccessEffect = gen.next()
				expect(allLoginSuccessEffect.value).toEqual(
					all({
						loginSuccess: put(
							createAction(AUTH_ACTION.GET_TOKEN_SUCCEEDED, {
								oauthToken: sampleOAuthToken
							})
						),
						getUserInfo: put(
							createAction(NET_ACTION.DATA_REQUESTED, { modelName: 'user.userInfo' })
						),
						logOut: take(AUTH_ACTION.LOG_OUT_REQUESTED)
					})
				)
			})

			test('puts LOGIN_FAILED if race condition fail', () => {
				const raceLoginActionEffect = gen.next()
				const putLoginRequestedEffect = gen.next({
					// no success
				})
				const putLoginFailedEffect = gen.next(undefined)
				expect(putLoginFailedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.LOGIN_FAILED))
				)
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
				expect(putLoginFailedEffect.value).toEqual(
					put(createAction(AUTH_ACTION.LOGIN_FAILED))
				)
			})
		})

		describe('with oauthToken', () => {
			const oauthToken = sampleOAuthToken
			let gen: SagaIterator
			beforeEach(() => {
				gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(oauthToken)
				const takeEveryFetchFailureEffect = gen.next()
			})

			test('triggers all login effects after loading oauthToken', () => {
				const callPersistTokenEffect = gen.next()
				expect(callPersistTokenEffect.value).toEqual(
					call(defaultTokenPersistenceService.persistToken, oauthToken)
				)
				const allLoginSuccessEffect = gen.next()
				expect(allLoginSuccessEffect.value).toEqual(
					all({
						loginSuccess: put(
							createAction(AUTH_ACTION.GET_TOKEN_SUCCEEDED, { oauthToken })
						),
						getUserInfo: put(
							createAction(NET_ACTION.DATA_REQUESTED, { modelName: 'user.userInfo' })
						),
						logOut: take(AUTH_ACTION.LOG_OUT_REQUESTED)
					})
				)
			})
		})

		describe('LOG_OUT_REQUESTED', () => {
			const oauthToken = { access_token: 'some-access-token' }
			let gen: SagaIterator
			beforeEach(() => {
				gen = authSaga(clientCredentials)
				const callGetPersistedTokenEffect = gen.next()
				const putAuthInitializedEffect = gen.next(oauthToken)
				const takeEveryFetchFailureEffect = gen.next()
			})

			test('clears user data after log out requested, and restarts loop back to race effect', () => {
				const callPersistTokenEffect = gen.next()
				const allLoginSuccessEffect = gen.next()
				const allClearDataEffect = gen.next()
				expect(allClearDataEffect.value).toEqual(
					all({
						clearUserData: put(
							createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, { modelName: 'user' })
						),
						clearPersistentToken: call(
							defaultTokenPersistenceService.persistToken,
							null
						)
					})
				)
				const raceLoginActionEffect = gen.next()
				expect(raceLoginActionEffect.value).toEqual(
					race({
						casV1Action: take(AUTH_ACTION.CAS_V1_LOGIN_REQUESTED),
						casProxyAction: take(AUTH_ACTION.CAS_PROXY_LOGIN_REQUESTED),
						localAction: take(AUTH_ACTION.LOCAL_LOGIN_REQUESTED)
					})
				)
			})
		})
	})
})
