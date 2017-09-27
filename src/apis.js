export default {
	codeFromTicket: {
		path: '/???'
	},
	codeFromLocalCredentials: {
		path: '/api/account/local',
		method: 'POST'
	},
	codeFromCasV1: {
		path: '/api/account/CasV1',
		method: 'POST'
	},
	codeFromCasProxy: {
		path: '/api/account/CasProxy',
		method: 'POST'
	},
	codeFromCasTicket: {
		path: '/api/Account/ValidateCasTicket'
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
}
