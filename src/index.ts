export { default as AUTH_ACTION } from './actions'
export * from './types'

import endpointMappings from './endpointMappings'
import authReducer from './authReducer'
import authSaga, { getOauthToken } from './authSaga'

const sagas = { authSaga }
const reducers = { authReducer }

export { endpointMappings, reducers, sagas, getOauthToken }
