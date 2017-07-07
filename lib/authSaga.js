'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.default = authSaga;
exports.getOauthToken = getOauthToken;

var _reduxSaga = require('redux-saga');

var _effects = require('redux-saga/effects');

var _studiokitNetJs = require('studiokit-net-js');

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _services = require('./services');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [getTokenFromCode, getTokenFromRefreshToken, tokenRefreshLoop, headlessCasLoginFlow, casLoginFlow, shibLoginFlow, localLoginFlow, facebookLoginFlow, handleAuthFailure, authSaga].map(_regenerator2.default.mark);

var clientCredentials = void 0,
    oauthToken = void 0;
var logger = void 0;

function getTokenFromCode(code) {
	var getTokenModelName, formBody, formBodyString, tokenFetchResultAction;
	return _regenerator2.default.wrap(function getTokenFromCode$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					getTokenModelName = 'getToken';
					// Manually creating form-url-encoded body here because NOTHING else uses this content-type
					// but the OAuth spec requires it

					formBody = ['grant_type=authorization_code', 'client_id=' + clientCredentials.client_id, 'client_secret=' + clientCredentials.client_secret, 'code=' + encodeURIComponent(code)];
					formBodyString = formBody.join('&');
					_context.next = 5;
					return (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.DATA_REQUESTED, {
						modelName: getTokenModelName,
						body: formBodyString,
						noStore: true
					}));

				case 5:
					_context.next = 7;
					return (0, _effects.take)(function (action) {
						return action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getTokenModelName;
					});

				case 7:
					tokenFetchResultAction = _context.sent;
					return _context.abrupt('return', tokenFetchResultAction.data.error ? null : tokenFetchResultAction.data);

				case 9:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this);
}

function getTokenFromRefreshToken(oauthToken) {
	var getTokenModelName, formBody, formBodyString, tokenFetchResultAction;
	return _regenerator2.default.wrap(function getTokenFromRefreshToken$(_context2) {
		while (1) {
			switch (_context2.prev = _context2.next) {
				case 0:
					getTokenModelName = 'getToken';
					// Manually creating form-url-encoded body here because NOTHING else uses this content-type
					// but the OAuth spec requires it

					formBody = ['grant_type=refresh_token', 'client_id=' + clientCredentials.client_id, 'client_secret=' + clientCredentials.client_secret, 'refresh_token=' + encodeURIComponent(oauthToken.refresh_token)];
					formBodyString = formBody.join('&');
					_context2.next = 5;
					return (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.DATA_REQUESTED, {
						modelName: getTokenModelName,
						body: formBodyString,
						noStore: true
					}));

				case 5:
					_context2.next = 7;
					return (0, _effects.take)(function (action) {
						return action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getTokenModelName;
					});

				case 7:
					tokenFetchResultAction = _context2.sent;

					if (!tokenFetchResultAction.data.error) {
						_context2.next = 14;
						break;
					}

					_context2.next = 11;
					return (0, _effects.all)({
						logOut: (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOG_OUT_REQUESTED)),
						signalRefreshFailed: (0, _effects.put)((0, _actions.createAction)(_actions2.default.TOKEN_REFRESH_FAILED))
					});

				case 11:
					return _context2.abrupt('return', null);

				case 14:
					return _context2.abrupt('return', tokenFetchResultAction.data);

				case 15:
				case 'end':
					return _context2.stop();
			}
		}
	}, _marked[1], this);
}

function tokenRefreshLoop(tokenPersistenceService) {
	var tokenAboutToExpireTime, _ref, timerExpired;

	return _regenerator2.default.wrap(function tokenRefreshLoop$(_context3) {
		while (1) {
			switch (_context3.prev = _context3.next) {
				case 0:
					logger(oauthToken);

				case 1:
					if (!oauthToken) {
						_context3.next = 26;
						break;
					}

					logger('Token expires: ' + new Date(oauthToken['.expires']));

					// Refresh when token is nearly expired
					// Could be already expired if it was pulled out of persistent storage
					tokenAboutToExpireTime = Math.max((new Date(oauthToken['.expires']) - new Date()) * 0.85, 0);

					logger('tokenAboutToExpireTime (ms): ' + tokenAboutToExpireTime);
					_context3.next = 7;
					return (0, _effects.race)({
						timerExpired: (0, _effects.call)(_reduxSaga.delay, tokenAboutToExpireTime),
						loggedOut: (0, _effects.take)(_actions2.default.LOG_OUT_REQUESTED)
					});

				case 7:
					_ref = _context3.sent;
					timerExpired = _ref.timerExpired;

					logger('Token refresh loop race complete');
					logger('timerExpired: ' + (timerExpired === true));

					if (!timerExpired) {
						_context3.next = 23;
						break;
					}

					logger('Refreshing OAuth token');
					logger(oauthToken);
					_context3.next = 16;
					return (0, _effects.call)(getTokenFromRefreshToken, oauthToken);

				case 16:
					oauthToken = _context3.sent;
					_context3.next = 19;
					return (0, _effects.all)({
						sendTokenForIntercept: (0, _effects.put)((0, _actions.createAction)(_actions2.default.TOKEN_REFRESH_SUCCEEDED, { oauthToken: oauthToken })),
						persistToken: (0, _effects.call)(tokenPersistenceService.persistToken, oauthToken)
					});

				case 19:
					logger('OAuth token refreshed');
					logger(oauthToken);
					_context3.next = 24;
					break;

				case 23:
					oauthToken = null;

				case 24:
					_context3.next = 1;
					break;

				case 26:
				case 'end':
					return _context3.stop();
			}
		}
	}, _marked[2], this);
}

function headlessCasLoginFlow(credentials) {
	var getCodeModelName, _ref2, resultReceived, loginFailed, code;

	return _regenerator2.default.wrap(function headlessCasLoginFlow$(_context4) {
		while (1) {
			switch (_context4.prev = _context4.next) {
				case 0:
					getCodeModelName = 'codeFromCasCredentials';
					_context4.next = 3;
					return (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.DATA_REQUESTED, {
						modelName: getCodeModelName,
						body: credentials,
						noStore: true,
						timeLimit: 120000
					}));

				case 3:
					_context4.next = 5;
					return (0, _effects.race)({
						resultReceived: (0, _effects.take)(function (action) {
							return action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName;
						}),
						loginFailed: (0, _effects.take)(function (action) {
							return action.type === _studiokitNetJs.actions.FETCH_FAILED && action.modelName === getCodeModelName;
						})
					});

				case 5:
					_ref2 = _context4.sent;
					resultReceived = _ref2.resultReceived;
					loginFailed = _ref2.loginFailed;

					if (!loginFailed) {
						_context4.next = 10;
						break;
					}

					return _context4.abrupt('return', null);

				case 10:
					code = resultReceived.data.Code;

					if (code) {
						_context4.next = 13;
						break;
					}

					return _context4.abrupt('return', null);

				case 13:
					_context4.next = 15;
					return getTokenFromCode(code);

				case 15:
					return _context4.abrupt('return', _context4.sent);

				case 16:
				case 'end':
					return _context4.stop();
			}
		}
	}, _marked[3], this);
}

function casLoginFlow(ticket) {
	var getCodeModelName, action, code;
	return _regenerator2.default.wrap(function casLoginFlow$(_context5) {
		while (1) {
			switch (_context5.prev = _context5.next) {
				case 0:
					getCodeModelName = 'codeFromCasTicket';
					_context5.next = 3;
					return (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.DATA_REQUESTED, {
						modelName: getCodeModelName,
						noStore: true,
						queryParams: {
							ticket: ticket
						}
					}));

				case 3:
					_context5.next = 5;
					return (0, _effects.take)(function (action) {
						return action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName;
					});

				case 5:
					action = _context5.sent;
					code = action.data.Code;

					if (code) {
						_context5.next = 9;
						break;
					}

					return _context5.abrupt('return', null);

				case 9:
					_context5.next = 11;
					return getTokenFromCode(code);

				case 11:
					return _context5.abrupt('return', _context5.sent);

				case 12:
				case 'end':
					return _context5.stop();
			}
		}
	}, _marked[4], this);
}

function shibLoginFlow() {
	return _regenerator2.default.wrap(function shibLoginFlow$(_context6) {
		while (1) {
			switch (_context6.prev = _context6.next) {
				case 0:
					return _context6.abrupt('return', 'tokenViaShib');

				case 1:
				case 'end':
					return _context6.stop();
			}
		}
	}, _marked[5], this);
}

function localLoginFlow(credentials) {
	var getCodeModelName, action, code;
	return _regenerator2.default.wrap(function localLoginFlow$(_context7) {
		while (1) {
			switch (_context7.prev = _context7.next) {
				case 0:
					// credentials -> code -> token
					getCodeModelName = 'codeFromLocalCredentials';
					_context7.next = 3;
					return (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.DATA_REQUESTED, {
						modelName: getCodeModelName,
						body: credentials,
						noStore: true
					}));

				case 3:
					_context7.next = 5;
					return (0, _effects.take)(function (action) {
						return (action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED || action.type === _studiokitNetJs.actions.FETCH_FAILED) && action.modelName === getCodeModelName;
					});

				case 5:
					action = _context7.sent;
					code = void 0;

					if (action.data && action.data.code) {
						code = action.data.Code;
					}

					if (code) {
						_context7.next = 10;
						break;
					}

					return _context7.abrupt('return', null);

				case 10:
					_context7.next = 12;
					return getTokenFromCode(code);

				case 12:
					return _context7.abrupt('return', _context7.sent);

				case 13:
				case 'end':
					return _context7.stop();
			}
		}
	}, _marked[6], this);
}

function facebookLoginFlow(payload) {
	return _regenerator2.default.wrap(function facebookLoginFlow$(_context8) {
		while (1) {
			switch (_context8.prev = _context8.next) {
				case 0:
					return _context8.abrupt('return', 'noFreakingClue');

				case 1:
				case 'end':
					return _context8.stop();
			}
		}
	}, _marked[7], this);
}

function handleAuthFailure(action) {
	return _regenerator2.default.wrap(function handleAuthFailure$(_context9) {
		while (1) {
			switch (_context9.prev = _context9.next) {
				case 0:
					if (!(oauthToken && action.errorData.code >= 400 && action.errorData.code <= 499)) {
						_context9.next = 4;
						break;
					}

					_context9.next = 3;
					return (0, _effects.call)(getTokenFromRefreshToken, oauthToken);

				case 3:
					oauthToken = _context9.sent;

				case 4:
				case 'end':
					return _context9.stop();
			}
		}
	}, _marked[8], this);
}

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 * 
 * @param {string} message - The message to log
 */
var consoleLogger = function consoleLogger(message) {
	console.debug(message);
};

function authSaga(clientCredentialsParam) {
	var tokenPersistenceServiceParam = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _services.tokenPersistenceService;
	var loggerParam = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : consoleLogger;

	var localTokenPersistenceService, _ref3, headlessCasAction, casAction, shibAction, localAction, facebookAction;

	return _regenerator2.default.wrap(function authSaga$(_context10) {
		while (1) {
			switch (_context10.prev = _context10.next) {
				case 0:
					if (clientCredentialsParam) {
						_context10.next = 2;
						break;
					}

					throw new Error("'clientCredentials' is required for auth saga");

				case 2:
					clientCredentials = clientCredentialsParam;

					localTokenPersistenceService = tokenPersistenceServiceParam;
					_context10.next = 6;
					return (0, _effects.call)(localTokenPersistenceService.getPersistedToken);

				case 6:
					oauthToken = _context10.sent;
					_context10.next = 9;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.AUTH_INITIALIZED));

				case 9:

					logger = loggerParam;
					logger('logger set to ' + logger.name);

					//yield takeEvery(netActions.FETCH_TRY_FAILED, handleAuthFailure)

				case 11:
					if (!true) {
						_context10.next = 63;
						break;
					}

					if (oauthToken) {
						_context10.next = 51;
						break;
					}

					_context10.next = 15;
					return (0, _effects.race)({
						headlessCasAction: (0, _effects.take)(_actions2.default.HEADLESS_CAS_LOGIN_REQUESTED),
						casAction: (0, _effects.take)(_actions2.default.CAS_LOGIN_REQUESTED),
						shibAction: (0, _effects.take)(_actions2.default.SHIB_LOGIN_REQUESTED),
						localAction: (0, _effects.take)(_actions2.default.LOCAL_LOGIN_REQUESTED),
						facebookAction: (0, _effects.take)(_actions2.default.FACEBOOK_LOGIN_REQUESTED)
					});

				case 15:
					_ref3 = _context10.sent;
					headlessCasAction = _ref3.headlessCasAction;
					casAction = _ref3.casAction;
					shibAction = _ref3.shibAction;
					localAction = _ref3.localAction;
					facebookAction = _ref3.facebookAction;
					_context10.next = 23;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_REQUESTED));

				case 23:
					if (!headlessCasAction) {
						_context10.next = 29;
						break;
					}

					_context10.next = 26;
					return (0, _effects.call)(headlessCasLoginFlow, headlessCasAction.payload);

				case 26:
					oauthToken = _context10.sent;
					_context10.next = 51;
					break;

				case 29:
					if (!casAction) {
						_context10.next = 35;
						break;
					}

					_context10.next = 32;
					return (0, _effects.call)(casLoginFlow, casAction.payload);

				case 32:
					oauthToken = _context10.sent;
					_context10.next = 51;
					break;

				case 35:
					if (!shibAction) {
						_context10.next = 41;
						break;
					}

					_context10.next = 38;
					return (0, _effects.call)(shibLoginFlow, shibAction.payload);

				case 38:
					oauthToken = _context10.sent;
					_context10.next = 51;
					break;

				case 41:
					if (!localAction) {
						_context10.next = 47;
						break;
					}

					_context10.next = 44;
					return (0, _effects.call)(localLoginFlow, localAction.payload);

				case 44:
					oauthToken = _context10.sent;
					_context10.next = 51;
					break;

				case 47:
					if (!facebookAction) {
						_context10.next = 51;
						break;
					}

					_context10.next = 50;
					return (0, _effects.call)(facebookLoginFlow, facebookAction.payload);

				case 50:
					oauthToken = _context10.sent;

				case 51:
					if (!oauthToken) {
						_context10.next = 56;
						break;
					}

					_context10.next = 54;
					return (0, _effects.all)({
						loginSuccess: (0, _effects.put)((0, _actions.createAction)(_actions2.default.GET_TOKEN_SUCCEEDED, { oauthToken: oauthToken })),
						refreshLoop: (0, _effects.call)(tokenRefreshLoop, localTokenPersistenceService),
						persistToken: (0, _effects.call)(localTokenPersistenceService.persistToken, oauthToken),
						logOut: (0, _effects.take)(_actions2.default.LOG_OUT_REQUESTED)
					});

				case 54:
					_context10.next = 58;
					break;

				case 56:
					_context10.next = 58;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_FAILED));

				case 58:
					_context10.next = 60;
					return (0, _effects.all)({
						clearUserData: (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.KEY_REMOVAL_REQUESTED, { modelName: 'user' })),
						clearPersistentToken: (0, _effects.call)(localTokenPersistenceService.persistToken, null)
					});

				case 60:
					oauthToken = null;
					_context10.next = 11;
					break;

				case 63:
				case 'end':
					return _context10.stop();
			}
		}
	}, _marked[9], this);
}

function getOauthToken() {
	console.debug('getOauthToken: ', oauthToken);
	return oauthToken;
}