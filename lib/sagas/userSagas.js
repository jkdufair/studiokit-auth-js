'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.user = user;

var _effects = require('redux-saga/effects');

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

var _services = require('../services');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [getUserInfo, user].map(_regenerator2.default.mark);

function getUserInfo() {
	var userInfo;
	return _regenerator2.default.wrap(function getUserInfo$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					_context.next = 2;
					return (0, _effects.call)(_services.userService.getInfo);

				case 2:
					userInfo = _context.sent;
					_context.next = 5;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.STORE_USER_INFO, userInfo));

				case 5:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this);
}

function user() {
	return _regenerator2.default.wrap(function user$(_context2) {
		while (1) {
			switch (_context2.prev = _context2.next) {
				case 0:
					_context2.next = 2;
					return (0, _effects.takeEvery)(_actions2.default.LOGIN_SUCCESS, getUserInfo);

				case 2:
				case 'end':
					return _context2.stop();
			}
		}
	}, _marked[1], this);
}