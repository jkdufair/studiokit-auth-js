'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.default = authSaga;
exports.getOauthToken = getOauthToken;

var _effects = require('redux-saga/effects');

var _studiokitNetJs = require('studiokit-net-js');

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _services = require('./services');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [getTokenFromCode, getTokenFromRefreshToken, performTokenRefresh, headlessCasLoginFlow, casLoginFlow, shibLoginFlow, localLoginFlow, facebookLoginFlow, handleAuthFailure, authSaga, getOauthToken].map(_regenerator2.default.mark);

var clientCredentials = void 0,
    oauthToken = void 0;
var logger = void 0;
var tokenPersistenceService = void 0;
var refreshLock = void 0;

// TODO: ...data.Code || ...data.code is because Forecast uses capitalized property names. Needs fixing
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
						noAuth: true,
						noStore: true,
						timeLimit: 60000
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

function performTokenRefresh() {
	return _regenerator2.default.wrap(function performTokenRefresh$(_context3) {
		while (1) {
			switch (_context3.prev = _context3.next) {
				case 0:
					logger('Refreshing OAuth token');

					if (!refreshLock) {
						_context3.next = 3;
						break;
					}

					return _context3.abrupt('return');

				case 3:
					refreshLock = true;
					_context3.next = 6;
					return (0, _effects.call)(getTokenFromRefreshToken, oauthToken);

				case 6:
					oauthToken = _context3.sent;
					_context3.next = 9;
					return (0, _effects.all)({
						sendTokenForIntercept: (0, _effects.put)((0, _actions.createAction)(_actions2.default.TOKEN_REFRESH_SUCCEEDED, { oauthToken: oauthToken })),
						persistToken: (0, _effects.call)(tokenPersistenceService.persistToken, oauthToken)
					});

				case 9:
					refreshLock = false;
					logger('OAuth token refreshed');

				case 11:
				case 'end':
					return _context3.stop();
			}
		}
	}, _marked[2], this);
}

function headlessCasLoginFlow(credentials) {
	var getCodeModelName, _ref, resultReceived, loginFailed, code;

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
					_ref = _context4.sent;
					resultReceived = _ref.resultReceived;
					loginFailed = _ref.loginFailed;

					if (!loginFailed) {
						_context4.next = 10;
						break;
					}

					return _context4.abrupt('return', null);

				case 10:
					code = resultReceived.data.Code || resultReceived.data.code;

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
					code = action.data.Code || action.data.code;

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

					if (action.data && (action.data.Code || action.data.code)) {
						code = action.data.Code || action.data.code;
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
					if (!(oauthToken && action.errorData.code >= 400 && action.errorData.code <= 499 && new Date(oauthToken['.expires']) < new Date())) {
						_context9.next = 4;
						break;
					}

					logger('token expired - refreshing');
					_context9.next = 4;
					return (0, _effects.call)(performTokenRefresh);

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

	var _ref2, headlessCasAction, casAction, shibAction, localAction, facebookAction;

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

					tokenPersistenceService = tokenPersistenceServiceParam;
					_context10.next = 6;
					return (0, _effects.call)(tokenPersistenceService.getPersistedToken);

				case 6:
					oauthToken = _context10.sent;
					_context10.next = 9;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.AUTH_INITIALIZED));

				case 9:

					logger = loggerParam;
					logger('logger set to ' + logger.name);

					_context10.next = 13;
					return (0, _effects.takeEvery)(_studiokitNetJs.actions.FETCH_TRY_FAILED, handleAuthFailure);

				case 13:
					if (!true) {
						_context10.next = 65;
						break;
					}

					if (oauthToken) {
						_context10.next = 53;
						break;
					}

					_context10.next = 17;
					return (0, _effects.race)({
						headlessCasAction: (0, _effects.take)(_actions2.default.HEADLESS_CAS_LOGIN_REQUESTED),
						casAction: (0, _effects.take)(_actions2.default.CAS_LOGIN_REQUESTED),
						shibAction: (0, _effects.take)(_actions2.default.SHIB_LOGIN_REQUESTED),
						localAction: (0, _effects.take)(_actions2.default.LOCAL_LOGIN_REQUESTED),
						facebookAction: (0, _effects.take)(_actions2.default.FACEBOOK_LOGIN_REQUESTED)
					});

				case 17:
					_ref2 = _context10.sent;
					headlessCasAction = _ref2.headlessCasAction;
					casAction = _ref2.casAction;
					shibAction = _ref2.shibAction;
					localAction = _ref2.localAction;
					facebookAction = _ref2.facebookAction;
					_context10.next = 25;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_REQUESTED));

				case 25:
					if (!headlessCasAction) {
						_context10.next = 31;
						break;
					}

					_context10.next = 28;
					return (0, _effects.call)(headlessCasLoginFlow, headlessCasAction.payload);

				case 28:
					oauthToken = _context10.sent;
					_context10.next = 53;
					break;

				case 31:
					if (!casAction) {
						_context10.next = 37;
						break;
					}

					_context10.next = 34;
					return (0, _effects.call)(casLoginFlow, casAction.payload);

				case 34:
					oauthToken = _context10.sent;
					_context10.next = 53;
					break;

				case 37:
					if (!shibAction) {
						_context10.next = 43;
						break;
					}

					_context10.next = 40;
					return (0, _effects.call)(shibLoginFlow, shibAction.payload);

				case 40:
					oauthToken = _context10.sent;
					_context10.next = 53;
					break;

				case 43:
					if (!localAction) {
						_context10.next = 49;
						break;
					}

					_context10.next = 46;
					return (0, _effects.call)(localLoginFlow, localAction.payload);

				case 46:
					oauthToken = _context10.sent;
					_context10.next = 53;
					break;

				case 49:
					if (!facebookAction) {
						_context10.next = 53;
						break;
					}

					_context10.next = 52;
					return (0, _effects.call)(facebookLoginFlow, facebookAction.payload);

				case 52:
					oauthToken = _context10.sent;

				case 53:
					if (!oauthToken) {
						_context10.next = 58;
						break;
					}

					_context10.next = 56;
					return (0, _effects.all)({
						loginSuccess: (0, _effects.put)((0, _actions.createAction)(_actions2.default.GET_TOKEN_SUCCEEDED, { oauthToken: oauthToken })),
						persistToken: (0, _effects.call)(tokenPersistenceService.persistToken, oauthToken),
						logOut: (0, _effects.take)(_actions2.default.LOG_OUT_REQUESTED)
					});

				case 56:
					_context10.next = 60;
					break;

				case 58:
					_context10.next = 60;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_FAILED));

				case 60:
					_context10.next = 62;
					return (0, _effects.all)({
						clearUserData: (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.KEY_REMOVAL_REQUESTED, { modelName: 'user' })),
						clearPersistentToken: (0, _effects.call)(tokenPersistenceService.persistToken, null)
					});

				case 62:
					oauthToken = null;
					_context10.next = 13;
					break;

				case 65:
				case 'end':
					return _context10.stop();
			}
		}
	}, _marked[9], this);
}

function getOauthToken(modelName) {
	var currentTime;
	return _regenerator2.default.wrap(function getOauthToken$(_context11) {
		while (1) {
			switch (_context11.prev = _context11.next) {
				case 0:
					if (!(modelName === 'getToken')) {
						_context11.next = 2;
						break;
					}

					return _context11.abrupt('return', null);

				case 2:
					if (!(oauthToken && oauthToken['.expires'])) {
						_context11.next = 9;
						break;
					}

					currentTime = new Date();

					currentTime.setSeconds(currentTime.getSeconds() - 30);

					if (!(new Date(oauthToken['.expires']) < currentTime)) {
						_context11.next = 9;
						break;
					}

					_context11.next = 8;
					return (0, _effects.all)([(0, _effects.call)(performTokenRefresh), (0, _effects.take)(_actions2.default.TOKEN_REFRESH_SUCCEEDED)]);

				case 8:
					return _context11.abrupt('return', oauthToken);

				case 9:
					return _context11.abrupt('return', oauthToken);

				case 10:
				case 'end':
					return _context11.stop();
			}
		}
	}, _marked[10], this);
}