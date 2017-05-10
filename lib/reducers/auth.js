'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = auth;

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function auth() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var action = arguments[1];

	switch (action.type) {
		case _actions2.default.GET_TOKEN_SUCCEEDED:
		case _actions2.default.TOKEN_REFRESH_SUCCEEDED:
			return Object.assign({}, state, {
				isAuthenticated: true
			});

		case _actions2.default.LOG_OUT_REQUESTED:
			return Object.assign({}, state, {
				isAuthenticated: false
			});

		default:
			return state;
	}
}