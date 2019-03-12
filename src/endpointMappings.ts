import { EndpointMappings } from 'studiokit-net-js'

const endpointMappings: EndpointMappings = {
	codeFromLocalCredentials: {
		_config: {
			fetch: {
				path: '/api/account/local',
				method: 'POST'
			}
		}
	},
	codeFromCasV1: {
		_config: {
			fetch: {
				path: '/api/account/CasV1',
				method: 'POST'
			}
		}
	},
	codeFromCasTicket: {
		_config: { fetch: { path: '/api/Account/ValidateCasTicket' } }
	},
	getToken: {
		_config: {
			fetch: {
				path: '/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}
		}
	},
	user: {
		userInfo: {
			_config: { fetch: { path: '/api/Account/UserInfo' } }
		}
	}
}

export default endpointMappings
