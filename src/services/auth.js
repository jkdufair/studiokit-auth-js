let storedToken;

const authService = {
	getPersistedToken: () => {
		return storedToken;
	},

	persistToken: (token) => {
		storedToken = token
	}
}

export { authService };