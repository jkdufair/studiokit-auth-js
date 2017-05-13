'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.auth = auth;

var _reduxSaga = require('redux-saga');

var _effects = require('redux-saga/effects');

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

var _studiokitNetJs = require('studiokit-net-js');

var _services = require('../services');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [getTokenFromCode, getTokenFromRefreshToken, tokenRefreshLoop, headlessCasLoginFlow, casLoginFlow, shibLoginFlow, localLoginFlow, facebookLoginFlow, handleAuthFailure, auth].map(_regenerator2.default.mark);

var clientCredentials = void 0,
    oauthToken = void 0;

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
	var getTokenModelName, formBody, formBodyString, tokenFetchResultAction, refreshedToken;
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
					refreshedToken = tokenFetchResultAction.data;
					_context2.next = 17;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.TOKEN_REFRESH_SUCCEEDED, { oauthToken: refreshedToken }));

				case 17:
					_context2.next = 19;
					return (0, _effects.call)(_services.authService.persistToken, refreshedToken);

				case 19:
					return _context2.abrupt('return', refreshedToken);

				case 20:
				case 'end':
					return _context2.stop();
			}
		}
	}, _marked[1], this);
}

function tokenRefreshLoop() {
	var _ref, timerExpired;

	return _regenerator2.default.wrap(function tokenRefreshLoop$(_context3) {
		while (1) {
			switch (_context3.prev = _context3.next) {
				case 0:
					if (!oauthToken) {
						_context3.next = 14;
						break;
					}

					_context3.next = 3;
					return (0, _effects.race)({
						// refresh when token hits 95% of the way to its expiration
						timerExpired: (0, _effects.call)(_reduxSaga.delay, oauthToken.expires_in * .95 * 1000),
						loggedOut: (0, _effects.take)(_actions2.default.LOG_OUT_REQUESTED)
					});

				case 3:
					_ref = _context3.sent;
					timerExpired = _ref.timerExpired;

					if (!timerExpired) {
						_context3.next = 11;
						break;
					}

					_context3.next = 8;
					return (0, _effects.call)(getTokenFromRefreshToken, oauthToken);

				case 8:
					oauthToken = _context3.sent;
					_context3.next = 12;
					break;

				case 11:
					oauthToken = null;

				case 12:
					_context3.next = 0;
					break;

				case 14:
				case 'end':
					return _context3.stop();
			}
		}
	}, _marked[2], this);
}

function headlessCasLoginFlow(credentials) {
	var getCodeModelName, action, code;
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
					return (0, _effects.take)(function (action) {
						return action.type === _studiokitNetJs.actions.TRANSIENT_FETCH_RESULT_RECEIVED && action.modelName === getCodeModelName;
					});

				case 5:
					action = _context4.sent;
					code = action.data.Code;

					if (code) {
						_context4.next = 9;
						break;
					}

					return _context4.abrupt('return', null);

				case 9:
					_context4.next = 11;
					return getTokenFromCode(code);

				case 11:
					return _context4.abrupt('return', _context4.sent);

				case 12:
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

function auth(clientCredentialsParam) {
	var _ref2, headlessCasAction, casAction, shibAction, localAction, facebookAction;

	return _regenerator2.default.wrap(function auth$(_context10) {
		while (1) {
			switch (_context10.prev = _context10.next) {
				case 0:
					if (clientCredentialsParam) {
						_context10.next = 2;
						break;
					}

					throw new Error('\'clientCredentials\' is required for auth saga');

				case 2:
					clientCredentials = clientCredentialsParam;

					_context10.next = 5;
					return (0, _effects.takeEvery)(_studiokitNetJs.actions.FETCH_TRY_FAILED, handleAuthFailure);

				case 5:
					_context10.next = 7;
					return (0, _effects.call)(_services.authService.getPersistedToken);

				case 7:
					oauthToken = _context10.sent;

				case 8:
					if (!true) {
						_context10.next = 60;
						break;
					}

					if (oauthToken) {
						_context10.next = 48;
						break;
					}

					_context10.next = 12;
					return (0, _effects.race)({
						headlessCasAction: (0, _effects.take)(_actions2.default.HEADLESS_CAS_LOGIN_REQUESTED),
						casAction: (0, _effects.take)(_actions2.default.CAS_LOGIN_REQUESTED),
						shibAction: (0, _effects.take)(_actions2.default.SHIB_LOGIN_REQUESTED),
						localAction: (0, _effects.take)(_actions2.default.LOCAL_LOGIN_REQUESTED),
						facebookAction: (0, _effects.take)(_actions2.default.FACEBOOK_LOGIN_REQUESTED)
					});

				case 12:
					_ref2 = _context10.sent;
					headlessCasAction = _ref2.headlessCasAction;
					casAction = _ref2.casAction;
					shibAction = _ref2.shibAction;
					localAction = _ref2.localAction;
					facebookAction = _ref2.facebookAction;
					_context10.next = 20;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_REQUESTED));

				case 20:
					if (!headlessCasAction) {
						_context10.next = 26;
						break;
					}

					_context10.next = 23;
					return (0, _effects.call)(headlessCasLoginFlow, headlessCasAction.payload);

				case 23:
					oauthToken = _context10.sent;
					_context10.next = 48;
					break;

				case 26:
					if (!casAction) {
						_context10.next = 32;
						break;
					}

					_context10.next = 29;
					return (0, _effects.call)(casLoginFlow, casAction.payload);

				case 29:
					oauthToken = _context10.sent;
					_context10.next = 48;
					break;

				case 32:
					if (!shibAction) {
						_context10.next = 38;
						break;
					}

					_context10.next = 35;
					return (0, _effects.call)(shibLoginFlow, shibAction.payload);

				case 35:
					oauthToken = _context10.sent;
					_context10.next = 48;
					break;

				case 38:
					if (!localAction) {
						_context10.next = 44;
						break;
					}

					_context10.next = 41;
					return (0, _effects.call)(localLoginFlow, localAction.payload);

				case 41:
					oauthToken = _context10.sent;
					_context10.next = 48;
					break;

				case 44:
					if (!facebookAction) {
						_context10.next = 48;
						break;
					}

					_context10.next = 47;
					return (0, _effects.call)(facebookLoginFlow, facebookAction.payload);

				case 47:
					oauthToken = _context10.sent;

				case 48:
					if (!oauthToken) {
						_context10.next = 53;
						break;
					}

					_context10.next = 51;
					return (0, _effects.all)({
						persistToken: (0, _effects.call)(_services.authService.persistToken, oauthToken),
						loginSuccess: (0, _effects.put)((0, _actions.createAction)(_actions2.default.GET_TOKEN_SUCCEEDED, { oauthToken: oauthToken })),
						refreshLoop: (0, _effects.call)(tokenRefreshLoop, oauthToken),
						logOut: (0, _effects.take)(_actions2.default.LOG_OUT_REQUESTED)
					});

				case 51:
					_context10.next = 55;
					break;

				case 53:
					_context10.next = 55;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_FAILED));

				case 55:
					_context10.next = 57;
					return (0, _effects.all)({
						clearUserData: (0, _effects.put)((0, _actions.createAction)(_studiokitNetJs.actions.KEY_REMOVAL_REQUESTED, { modelName: 'user' })),
						clearPersistentToken: (0, _effects.call)(_services.authService.persistToken, null)
					});

				case 57:
					oauthToken = null;
					_context10.next = 8;
					break;

				case 60:
				case 'end':
					return _context10.stop();
			}
		}
	}, _marked[9], this);
}