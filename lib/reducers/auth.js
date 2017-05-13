'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = auth;

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var initialState = {
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
};

function auth() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
	var action = arguments[1];

	switch (action.type) {
		case _actions2.default.GET_TOKEN_SUCCEEDED:
		case _actions2.default.TOKEN_REFRESH_SUCCEEDED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: true,
				didFail: false
			});

		case _actions2.default.LOGIN_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: true,
				isAuthenticated: false,
				didFail: false
			});

		case _actions2.default.LOG_OUT_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: false
			});

		case _actions2.default.LOGIN_FAILED:
			return Object.assign({}, state, {
				isAuthenticating: false,
				isAuthenticated: false,
				didFail: true
			});

		default:
			return state;
	}
}