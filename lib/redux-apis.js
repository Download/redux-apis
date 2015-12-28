'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.createReducer = createReducer;
exports.bind = bind;

var _reduxActions = require('redux-actions');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Api = (function () {
	function Api(state) {
		_classCallCheck(this, Api);

		Object.defineProperty(this, 'state', {
			get: function get() {
				if (this.parent) {
					var name = childName(this.parent, this);
					return this.parent.state[name];
				}
				if (this.store) {
					return this.store.getState();
				}
				return state;
			},
			set: function set(value) {
				if (!this.parent && !this.store) {
					state = value;
				}
			}
		});
	}

	_createClass(Api, [{
		key: 'sub',
		value: function sub(name, api) {
			this[name] = new api();
			this[name].parent = this;
		}
	}, {
		key: 'createAction',
		value: function createAction(actionType, payload) {
			var name = this.parent && childName(this.parent, this);

			for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
				args[_key - 2] = arguments[_key];
			}

			if (name) {
				var _parent;

				return (_parent = this.parent).createAction.apply(_parent, [name + '/' + actionType, payload].concat(args));
			} else {
				return (0, _reduxActions.createAction)(actionType).apply(undefined, [payload].concat(args));
			}
		}
	}, {
		key: 'dispatch',
		value: function dispatch(action) {
			if (this.parent) {
				this.parent.dispatch(action);
			} else if (this.store) {
				this.store.dispatch(action);
			} else {
				// root, but not connected to store, exec directly
				this.state = this.execute(action);
			}
		}
	}, {
		key: 'execute',
		value: function execute(action) {
			var idx = action.type.indexOf('/');
			var sub = idx !== -1 && action.type.substring(0, idx);
			var subs = Object.keys(this);
			var result = this.handle(action);
			if (result === this.state) {
				result = undefined;
			}
			for (var i = 0, key; key = subs[i]; i++) {
				if (key != 'parent' && this[key] instanceof Api) {
					var act = key !== sub ? action : _extends({}, action, { type: action.type.substring(idx + 1) });
					var subState = this[key].execute(act);
					if (this.state[key] !== subState) {
						result ? result[key] = subState : result = _extends({}, this.state, _defineProperty({}, key, subState));
					}
				}
			}
			return result || this.state;
		}
	}, {
		key: 'handle',
		value: function handle(action) {
			return this.state || {};
		}
	}]);

	return Api;
})();

exports.default = Api;
function createReducer(instance) {
	return function (state, action) {
		return instance.execute(action);
	};
}

function bind(instance, store) {
	instance.store = store;
}

function childName(parent, child) {
	var siblings = Object.keys(parent);
	for (var i = 0, name; name = siblings[i]; i++) {
		if (parent[name] === child) {
			return name;
		}
	}
}
//# sourceMappingURL=redux-apis.js.map
