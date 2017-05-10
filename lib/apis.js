'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var apis = {
	codeFromTicket: {
		path: '/???'
	},
	codeFromLocalCredentials: {
		path: '/api/account/local',
		method: 'POST'
	},
	codeFromCasCredentials: {
		path: '/api/account/CasProxy',
		method: 'POST'
	},
	codeFromCasTicket: {
		path: '/api/Account/ValidatePurdueCasTicket'
	},
	getToken: {
		path: '/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	},
	user: {
		userInfo: {
			path: '/api/Account/UserInfo'
		}
	}
};

exports.default = apis;