'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// stolen from https://github.com/acdlite/redux-actions/blob/v0.9.0/src/createAction.js
function _createAction(type, actionCreator, metaCreator) {
	var finalActionCreator = typeof actionCreator === 'function' ? actionCreator : function (t) {
		return t;
	};
	return function () {
		var action = { type: type, payload: finalActionCreator.apply(undefined, arguments) };
		if (arguments.length === 1 && arguments[0] instanceof Error) {
			action.error = true;
		}
		if (typeof metaCreator === 'function') {
			action.meta = metaCreator.apply(undefined, arguments);
		}
		return action;
	};
}

var Api = (function () {
	function Api(state) {
		_classCallCheck(this, Api);

		Object.defineProperty(this, 'state', {
			get: function get() {
				if (this.parent) {
					var name = childName(this.parent, this);
					return name ? this.parent.state && this.parent.state[name] : this.parent.state;
				}
				if (this.store) {
					var result = this.store.getState();
					return result;
				}
				return state;
			},
			set: function set(value) {
				if (!this.parent && !this.store) {
					state = value;
				}
			}
		});

		this.__handlers = {};
	}

	_createClass(Api, [{
		key: 'init',
		value: function init() {
			this.dispatch(this.createAction('@@redux-apis/INIT')());
			return this;
		}
	}, {
		key: 'sub',
		value: function sub(name, api) {
			this[name] = new api();
			this[name].parent = this;
		}
	}, {
		key: 'createAction',
		value: function createAction(actionType, actionCreator, metaCreator) {
			var name = childName(this.parent, this);
			if (name) {
				return this.parent.createAction(name + '/' + actionType, actionCreator, metaCreator);
			}
			return _createAction(actionType, actionCreator, metaCreator);
		}
	}, {
		key: 'dispatch',
		value: function dispatch(action) {
			var _this = this;

			if (this.parent) {
				return this.parent.dispatch(action);
			}
			if (this.store) {
				return this.store.dispatch(action);
			}
			if (typeof action == 'function') {
				return action(this.dispatch.bind(this), function () {
					return _this.state;
				});
			}
			this.state = this.handle(action);
			return action;
		}
	}, {
		key: 'initialState',
		value: function initialState() {
			return {};
		}
	}, {
		key: 'handle',
		value: function handle(action) {
			var idx = action.type.indexOf('/');
			var sub = idx !== -1 && action.type.substring(0, idx);
			var subs = Object.keys(this);
			var result = typeof this.__handlers[action.type] == 'function' ? this.__handlers[action.type].call(this, action) : this.state || this.initialState();
			if (result === this.state) {
				result = undefined;
			}
			for (var i = 0, key; key = subs[i]; i++) {
				if (key != 'parent' && this[key] instanceof Api) {
					var act = key !== sub ? action : _extends({}, action, { type: action.type.substring(idx + 1) });
					var subState = this[key].handle(act);
					if (!this.state || this.state[key] !== subState) {
						result ? result[key] = subState : result = _extends({}, this.state, _defineProperty({}, key, subState));
					}
				}
			}
			return result || this.state;
		}
	}, {
		key: 'addHandler',
		value: function addHandler(actionType, handler) {
			this.__handlers[actionType] = handler;
		}
	}]);

	return Api;
})();

exports.default = Api;

var RootApi = exports.RootApi = (function (_Api) {
	_inherits(RootApi, _Api);

	function RootApi(api, createStore, initialState) {
		_classCallCheck(this, RootApi);

		var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(RootApi).call(this));

		_this2.bind(api);
		var reducer = function reducer(state, action) {
			return _this2.__api.handle(action);
		};
		_this2.store = createStore(reducer, initialState);
		return _this2;
	}

	_createClass(RootApi, [{
		key: 'bind',
		value: function bind(api) {
			var _this3 = this;

			if (this.__api) {
				apiKeys(this.__api).forEach(function (key) {
					return delete _this3[key];
				});
				Object.keys(api).forEach(function (key) {
					return delete RootApi[key];
				});
			}
			this.__api = new api();
			apiKeys(this.__api).forEach(function (key) {
				_this3[key] = typeof _this3.__api[key] == 'function' ? _this3.__api[key].bind(_this3.__api) : _this3.__api[key];
			});
			Object.keys(api).forEach(function (key) {
				return RootApi[key] = api[key];
			});
			this.__api.parent = this;
		}
	}]);

	return RootApi;
})(Api);

var RESERVED = Object.getOwnPropertyNames(Object.getPrototypeOf(new Api())).concat(['parent', 'bind']);

function childName(parent, child) {
	if (parent && !(parent instanceof RootApi)) {
		var siblings = Object.keys(parent);
		for (var i = 0, name; name = siblings[i]; i++) {
			if (parent[name] === child) {
				return name;
			}
		}
	}
}

function apiKeys(obj) {
	return Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).concat(Object.keys(obj)).filter(function (key) {
		return RESERVED.indexOf(key) === -1;
	});
}
//# sourceMappingURL=redux-apis.js.map
