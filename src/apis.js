const apis = {	
	codeFromTicket: {
		path: '/???'
	},
	codeFromLocalCredentials: {
		path: '/api/account/local',
		method: 'POST'
	},
	tokenFromCode: {
		path: '/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	},
	userInfo: {
		path: '/api/Account/UserInfo'
	}
}

export default apis