'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var fetchMiddleware = function fetchMiddleware(store) {
	return function (next) {
		return function (action) {
			if (!action || !action.fetchConfig) {
				return next(action);
			}

			var dispatch = store.dispatch;
			var config = action.fetchConfig;
			dispatch(config.init);

			var path = config.path || '/';
			var method = config.method || 'GET';
			var headers = config.headers;
			var body = config.body;
			var successHandler = config.success;
			var failureHandler = config.failure;
			fetch(path, {
				method: method,
				headers: headers,
				body: JSON.stringify(body)
			}).then(function (response) {
				return response.json();
			}).then(function (json) {
				return successHandler(json);
			}).catch(function (error) {
				return failureHandler(error);
			});
		};
	};
};

exports.default = fetchMiddleware;