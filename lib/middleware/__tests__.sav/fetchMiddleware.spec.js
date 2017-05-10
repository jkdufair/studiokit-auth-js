'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _mocha = require('mocha');

var _chai = require('chai');

var _fetchMock = require('fetch-mock');

var _fetchMock2 = _interopRequireDefault(_fetchMock);

var _fetchMiddleware = require('../fetchMiddleware');

var _fetchMiddleware2 = _interopRequireDefault(_fetchMiddleware);

var _immutable = require('immutable');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var makeStore = function makeStore(initialState, dispatchFn) {
	var state = Object.assign({}, {
		appConfig: {
			baseUrl: ''
		}
	}, initialState);
	return {
		getState: function getState() {
			return state;
		},
		setState: function setState(s) {
			state = (0, _immutable.fromJS)(state).mergeDeep(s).toJS();
		},
		dispatch: dispatchFn == undefined ? function () {} : dispatchFn
	};
};

(0, _mocha.describe)('Fetch middleware', function () {
	(0, _mocha.describe)('non-fetch dispatch', function () {
		(0, _mocha.it)('should evaluate next() when non-fetch actions are dispatched', _asyncToGenerator(_regenerator2.default.mark(function _callee() {
			var testAction, result;
			return _regenerator2.default.wrap(function _callee$(_context) {
				while (1) {
					switch (_context.prev = _context.next) {
						case 0:
							testAction = {
								test: 'true'
							};
							result = (0, _fetchMiddleware2.default)()(function (action) {
								return action;
							})(testAction);

							(0, _chai.expect)(result).to.equal(testAction);

						case 3:
						case 'end':
							return _context.stop();
					}
				}
			}, _callee, undefined);
		})));
	});
	(0, _mocha.describe)('fetch', function () {
		(0, _mocha.it)('should dispatch init when there is an action.fetchConfig.init', function () {
			var dispatchResult = '';
			var store = makeStore({}, function (init) {
				dispatchResult = init;
			});
			(0, _fetchMiddleware2.default)(store)()({
				fetchConfig: {
					init: 'init',
					success: function success() {},
					failure: function failure() {}
				}
			});
			(0, _chai.expect)(dispatchResult).to.equal('init');
		});

		(0, _mocha.it)('should successfully fetch from a test json source', function (done) {
			(0, _fetchMiddleware2.default)(makeStore())()({
				fetchConfig: {
					path: 'http://echo.jsontest.com/key/value/one/two',
					success: function success(json) {
						(0, _chai.expect)(json).to.deep.equal({
							one: 'two',
							key: 'value'
						});
						done();
					},
					failure: function failure() {}
				}
			});
		});

		(0, _mocha.it)('should successfully pass headers to destination', function (done) {
			(0, _fetchMiddleware2.default)(makeStore())()({
				fetchConfig: {
					path: 'http://headers.jsontest.com/',
					headers: {
						'test': 'test'
					},
					success: function success(json) {
						(0, _chai.expect)(json.test).to.equal('test');
						done();
					},
					failure: function failure() {}
				}
			});
		});

		(0, _mocha.it)('should successfully POST headers to destination', function (done) {
			(0, _fetchMiddleware2.default)(makeStore())()({
				fetchConfig: {
					path: 'http://echo.jsontest.com/foo/bar',
					method: 'POST',
					success: function success(json) {
						(0, _chai.expect)(json).to.deep.equal({
							foo: 'bar'
						});
						done();
					},
					failure: function failure() {}
				}
			});
		});

		(0, _mocha.it)('should successfully POST body to destination', function (done) {
			(0, _fetchMiddleware2.default)(makeStore())()({
				fetchConfig: {
					path: 'https://httpbin.org/post',
					method: 'POST',
					body: {
						foo: 'bar'
					},
					success: function success(json) {
						(0, _chai.expect)(json.json.foo).to.equal('bar');
						done();
					},
					failure: function failure() {}
				}
			});
		});

		(0, _mocha.it)('should fail with a bad url', function (done) {
			(0, _fetchMiddleware2.default)(makeStore())()({
				fetchConfig: {
					path: 'http://fail.xyz.abc/',
					success: function success() {},
					failure: function failure(error) {
						(0, _chai.expect)(error.code).to.equal('ENOTFOUND');
						done();
					}
				}
			});
		});
	});
	(0, _mocha.describe)('auth fetch', function () {
		(0, _mocha.it)('should successfully get auth', function (done) {
			var authResponse = {
				"access_token": "some_token",
				"token_type": "bearer",
				"expires_in": 9999,
				"refresh_token": "some_refresh_token",
				".expires": "Thu, 27 Apr 2017 23:54:17 GMT",
				"client_id": "web",
				".issued": "Thu, 27 Apr 2017 21:54:17 GMT"
			};
			_fetchMock2.default.post('*', authResponse);
			var store = makeStore({
				auth: {
					isFetching: false
				}
			});
			(0, _fetchMiddleware2.default)(store)()({
				fetchConfig: {
					path: 'http://echo.jsontest.com/key/value/one/two',
					method: 'POST',
					requiresAuth: true,
					success: function success() {
						(0, _chai.expect)(store.getState()).to.deep.equal({
							appConfig: {
								baseUrl: ''
							},
							auth: {
								isFetching: false,
								data: authResponse
							}
						});
						done();
					},
					failure: function failure(error) {
						console.log(error);
					}
				}
			});
			_fetchMock2.default.restore();
		});
		(0, _mocha.it)('should successfully wait for auth when fetching', function (done) {
			var authResponse = {
				"access_token": "some_token",
				"token_type": "bearer",
				"expires_in": 9999,
				"refresh_token": "some_refresh_token",
				".expires": "Thu, 27 Apr 2017 23:54:17 GMT",
				"client_id": "web",
				".issued": "Thu, 27 Apr 2017 21:54:17 GMT"
			};
			_fetchMock2.default.post('*', authResponse);
			var store = makeStore({
				auth: {
					isFetching: true
				}
			});
			setTimeout(function () {
				store.setState({
					auth: {
						isFetching: false
					}
				});
			}, 500);
			(0, _fetchMiddleware2.default)(store)()({
				fetchConfig: {
					path: 'http://echo.jsontest.com/key/value/one/two',
					method: 'POST',
					requiresAuth: true,
					success: function success() {
						(0, _chai.expect)(store.getState()).to.deep.equal({
							appConfig: {
								baseUrl: ''
							},
							auth: {
								isFetching: false
							}
						});
						done();
					},
					failure: function failure(error) {
						console.log(error);
					}
				}
			});
			_fetchMock2.default.restore();
		});
	});
});