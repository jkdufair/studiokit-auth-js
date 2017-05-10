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
		case _actions2.default.STORE_USER_INFO:
			return Object.assign({}, state, {
				userInfo: action.userInfo
			});

		case _actions2.default.LOG_OUT_REQUESTED:
			debugger;
			return Object.assign({}, state, {
				userInfo: undefined
			});

		default:
			return state;
	}
}