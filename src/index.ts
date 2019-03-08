import AUTH_ACTIONS from './actions'
export { AUTH_ACTIONS }
// deprecated, backwards compatible export
export { AUTH_ACTIONS as actions }

export * from './types'

import endpointMappings from './endpointMappings'
export { endpointMappings }
// deprecated, backwards compatible export
export { endpointMappings as apis }

import authReducer from './authReducer'
import authSaga, { getOauthToken } from './authSaga'
const sagas = { authSaga }
const reducers = { authReducer }
export { reducers, sagas, getOauthToken }
