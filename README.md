# studiokit-auth-js

[![Coverage Status](https://coveralls.io/repos/purdue-tlt/studiokit-auth-js/badge.svg?branch=master)](https://coveralls.io/r/purdue-tlt/studiokit-auth-js?branch=master)

**studiokit-auth-js** is an expansion on the [studiokit-net-js](https://github.com/purdue-tlt/studiokit-net-js) library, adding authentication methods.

1. [Installation](#installation)
1. [Usage](#usage)
1. [Development](#development)

# Installation

## Install this library and redux-saga as a dependency
1. `yarn add studiokit-auth-js`
1. Follow the setup instructions from `studiokit-net-js`
1. Add the `authReducer` into your `reducers.js` module
	```js
	import { combineReducers } from 'redux'
	import { reducers as authReducers } from 'studiokit-auth-js'

	export default combineReducers({
		auth: authReducers.authReducer
	})
	```
1. Create services for `tokenPersistenceService`, `ticketProviderService`, and `codeProviderService`. The defaults do not return any results, but your services should most likely target AsyncStorage or LocalStorage and the `window.location.search` property. See `src/services.js` for reference.
	```js
	let storedToken

	const tokenPersistenceService: TokenPersistenceService = {
		getPersistedToken: () => {
			return storedToken
		},

		persistToken: token => {
			storedToken = token
		}
	}

	const ticketProviderService: TicketProviderService = {
		getTicket: () => null,
		getAppServiceName: () => null,
		removeTicket: () => {}
	}

	const codeProviderService: CodeProviderService = {
		getCode: () => null,
		removeCode: () => {}
	}
	```
1. Update your `rootSaga.js` module to add `authSaga` with your OAuth client credentials and services, merge your app's apis with `authApis`, and pass `getOauthToken` into `fetchSaga`.
	```js
	import { all } from 'redux-saga/effects'
	import { sagas as netSagas } from 'studiokit-net-js'
	import {
		sagas as authSagas,
		apis as authApis,
		getOauthToken,
		actions as authActions
	} from 'studiokit-auth-js'
	import apis from 'apis'

	export default function* rootSaga() {
		yield all({
			fetchSaga: netSagas.fetchSaga(
				_.merge(authApis, apis),
				'https://yourapp.com',
				getOauthToken
			),
			loginFlow: authSagas.authSaga(
				{
					client_id: 'id',
					client_secret: 'secret'
				},
				tokenPersistenceService,
				ticketProviderService,
				codeProviderService
			)
		})
	}
	```

# Usage

## Providers

Once you have the above steps completed, auth will be enabled. The `ticketProviderService` and `codeProviderService` should will used to handle auth redirects containing `code` or `ticket` query params.

## Store

Once the auth is completed, it will live in the redux store at the `auth` key, i.e.
```js
auth: {
	isInitialized: false,
	isAuthenticating: false,
	isAuthenticated: false,
	didFail: false
}
```

## Initialization

You can use the `AUTH_INITIALIZED` action to signal when the `authSaga` has completed initialization and handled one of the following cases:

1. Loaded a saved token using the `tokenPersistenceService`
2. Exchanged a `ticket` for a token
3. Exchanged a `code` for a token
4. Initialized without a token, ready for an auth action to trigger

At the time of initialization, use the value in redux at `auth.isAuthenticated` to determine if a token was loaded or exchanged.

## Manual Login

Alternately, you can dispatch manual auth actions to the store for login forms.

```js
import { dispatchAction } from 'services/actionService'
import { actions as authActions } from 'studiokit-auth-js'
.
.
.
dispatchAction(authActions.LOCAL_LOGIN_REQUESTED, {
	payload: {
		Username: 'joe',
		Password: 'joeRocks1!'
	}
})
```

# Development

During development of this library, you can clone this project and use

`yarn link`

to make the module available to another project's `node_modules` on the same computer without having to publish to a repo and pull to the other project. In the other folder, you can use

`yarn link studiokit-auth-js`

to add `studiokit-auth-js` to the consuming project's `node_modules`

## Build

Because this is a module, the source has to be transpiled to ES5 since the consuming project won't transpile anything in `node_modules`

`yarn build`

will transpile everything in `/src` to `/lib`. `/lib/index.js` is the entry point indicated in `package.json`

During development, you can run

`yarn build:watch`

and babel will rebuild the `/lib` folder when any file in `/src` changes.

When you commit, a commit hook will automatically regenerate `/lib`

## Deploy

This packaged is deployed via the npm repository. Until we add commit hooks for deployment, it must be published via `yarn publish`
