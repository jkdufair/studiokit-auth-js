"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var storedToken = void 0;

var tokenPersistenceService = {
	getPersistedToken: function getPersistedToken() {
		return storedToken;
	},

	persistToken: function persistToken(token) {
		storedToken = token;
	}
};

exports.tokenPersistenceService = tokenPersistenceService;