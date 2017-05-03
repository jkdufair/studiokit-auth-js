let storedToken;

const auth = {
	getPersistedToken: () => {
		return storedToken;
	},

	persistToken: (token) => {
		storedToken = token
	}
}

export { auth };