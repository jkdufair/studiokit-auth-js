const apis = {
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
}

export default apis