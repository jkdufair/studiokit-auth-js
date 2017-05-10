'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.loginFlow = loginFlow;

var _effects = require('redux-saga/effects');

var _services = require('../services');

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [casLoginFlow, shibLoginFlow, localLoginFlow, facebookLoginFlow, loginFlow].map(_regenerator2.default.mark);

function casLoginFlow(payload) {
	return _regenerator2.default.wrap(function casLoginFlow$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					// ticket -> code -> token
					console.log('casLoginFlow');

				case 1:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this);
}

function shibLoginFlow(payload) {
	return _regenerator2.default.wrap(function shibLoginFlow$(_context2) {
		while (1) {
			switch (_context2.prev = _context2.next) {
				case 0:
				case 'end':
					return _context2.stop();
			}
		}
	}, _marked[1], this);
}

function localLoginFlow(payload) {
	return _regenerator2.default.wrap(function localLoginFlow$(_context3) {
		while (1) {
			switch (_context3.prev = _context3.next) {
				case 0:
				case 'end':
					return _context3.stop();
			}
		}
	}, _marked[2], this);
}

function facebookLoginFlow(payload) {
	return _regenerator2.default.wrap(function facebookLoginFlow$(_context4) {
		while (1) {
			switch (_context4.prev = _context4.next) {
				case 0:
				case 'end':
					return _context4.stop();
			}
		}
	}, _marked[3], this);
}

function loginFlow() {
	var persistentToken, token, _ref, casAction, shibAction, localAction, facebookAction;

	return _regenerator2.default.wrap(function loginFlow$(_context5) {
		while (1) {
			switch (_context5.prev = _context5.next) {
				case 0:
					_context5.next = 2;
					return (0, _effects.call)(_services.auth.getPersistedToken);

				case 2:
					persistentToken = _context5.sent;

					if (!persistentToken) {
						_context5.next = 6;
						break;
					}

					_context5.next = 6;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.STORE_TOKEN, { token: persistentToken }));

				case 6:
					token = persistentToken;

				case 7:
					if (!true) {
						_context5.next = 53;
						break;
					}

					if (token) {
						_context5.next = 42;
						break;
					}

					_context5.next = 11;
					return (0, _effects.race)({
						casAction: (0, _effects.take)(_actions2.default.CAS_LOGIN),
						shibAction: (0, _effects.take)(_actions2.default.SHIB_LOGIN),
						localAction: (0, _effects.take)(_actions2.default.LOCAL_LOGIN),
						facebookAction: (0, _effects.take)(_actions2.default.FACEBOOK_LOGIN)
					});

				case 11:
					_ref = _context5.sent;
					casAction = _ref.casAction;
					shibAction = _ref.shibAction;
					localAction = _ref.localAction;
					facebookAction = _ref.facebookAction;

					if (!casAction) {
						_context5.next = 22;
						break;
					}

					_context5.next = 19;
					return (0, _effects.call)(casLoginFlow, casAction.payload);

				case 19:
					token = _context5.sent;
					_context5.next = 38;
					break;

				case 22:
					if (!shibAction) {
						_context5.next = 28;
						break;
					}

					_context5.next = 25;
					return (0, _effects.call)(shibLoginFlow, shibAction.payload);

				case 25:
					token = _context5.sent;
					_context5.next = 38;
					break;

				case 28:
					if (!localAction) {
						_context5.next = 34;
						break;
					}

					_context5.next = 31;
					return (0, _effects.call)(localLoginFlow, localAction.payload);

				case 31:
					token = _context5.sent;
					_context5.next = 38;
					break;

				case 34:
					if (!facebookAction) {
						_context5.next = 38;
						break;
					}

					_context5.next = 37;
					return (0, _effects.call)(facebookLoginFlow, facebookAction.payload);

				case 37:
					token = _context5.sent;

				case 38:
					_context5.next = 40;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.STORE_TOKEN, { token: token }));

				case 40:
					_context5.next = 42;
					return (0, _effects.call)(_services.auth.persistToken, token);

				case 42:
					_context5.next = 44;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.LOGIN_SUCCESS));

				case 44:
					_context5.next = 46;
					return (0, _effects.take)(_actions2.default.LOG_OUT);

				case 46:
					_context5.next = 48;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.DELETE_TOKEN));

				case 48:
					_context5.next = 50;
					return (0, _effects.call)(_services.auth.persistToken, null);

				case 50:
					token = null;
					_context5.next = 7;
					break;

				case 53:
				case 'end':
					return _context5.stop();
			}
		}
	}, _marked[4], this);
}