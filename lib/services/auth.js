"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var storedToken = void 0;

var authService = {
	getPersistedToken: function getPersistedToken() {
		return storedToken;
	},

	persistToken: function persistToken(token) {
		storedToken = token;
	}
};

exports.authService = authService;