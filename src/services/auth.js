let storedToken;

const tokenPersistenceService = {
	getPersistedToken: () => {
		return storedToken;
	},

	persistToken: (token) => {
		storedToken = token
	}
}

export { tokenPersistenceService };