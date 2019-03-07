import { EndpointMappings } from 'studiokit-net-js/lib/types'

const endpointMappings: EndpointMappings = {
	codeFromTicket: {
		_config: {
			fetch: {
				path: '/???'
			}
		}
	},
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
	codeFromCasProxy: {
		_config: {
			fetch: {
				path: '/api/account/CasProxy',
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
