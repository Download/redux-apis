(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	'use strict';
	
	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
	
	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();
	
	Object.defineProperty(exports, "__esModule", {
		value: true
	});
	exports.link = link;
	exports.onload = onload;
	exports.load = load;
	
	function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }
	
	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var Api = exports.Api = (function () {
		function Api() {
			var _this = this;
	
			var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
			_classCallCheck(this, Api);
	
			Object.defineProperties(this, {
				__actionHandlers: { value: {} },
				__state: { value: state, writable: true },
				__dispatch: { value: function value(action) {
						if (typeof action == 'function') {
							return action(_this.dispatch.bind(_this), _this.getState.bind(_this));
						}
						state = _this.reducer(state, action);
						return action;
					} },
				__parent: { value: undefined, writable: true },
				__link: { value: undefined, writable: true },
				connector: { value: this.connector.bind(this) },
				reducer: { value: this.reducer.bind(this) }
			});
		}
	
		_createClass(Api, [{
			key: 'init',
			value: function init() {
				this.dispatch(this.createAction('@@redux/INIT')());
				return this;
			}
		}, {
			key: 'dispatch',
			value: function dispatch(action) {
				return this.__parent ? this.__parent.dispatch(action) : this.__dispatch(action);
			}
		}, {
			key: 'getState',
			value: function getState() {
				return this.__parent ? this.__link ? this.__link(this.__parent.getState()) : this.__parent.getState() : this.__state;
			}
		}, {
			key: 'createAction',
			value: function createAction(actionType, payloadCreator, metaCreator) {
				return this.__parent instanceof Api ? this.__parent.createAction(childName(this.__parent, this) + '/' + actionType, payloadCreator, metaCreator) : _createAction(actionType, payloadCreator, metaCreator);
			}
		}, {
			key: 'setHandler',
			value: function setHandler(actionType, handler) {
				this.__actionHandlers[actionType] = handler;
			}
		}, {
			key: 'clearHandler',
			value: function clearHandler(actionType) {
				delete this.__actionHandlers[actionType];
			}
		}, {
			key: 'connector',
			value: function connector(state, ownProps) {
				return _extends({}, this.getState(), ownProps, { api: this });
			}
		}, {
			key: 'reducer',
			value: function reducer(state, action) {
				var _this2 = this;
	
				var idx = action.type.indexOf('/');
				var subAction = idx !== -1 && action.type.substring(0, idx);
				var result = this.__actionHandlers[action.type] ? this.__actionHandlers[action.type].call(this, state, action) : state === undefined ? this.__state : undefined;
				var subs = Object.keys(this).filter(function (key) {
					return _this2[key] instanceof Api;
				});
				subs.forEach(function (sub) {
					var act = sub !== subAction ? action : _extends({}, action, { type: action.type.substring(idx + 1) });
					var subResult = _this2[sub].reducer(_this2[sub].__link(state), act);
					if (state === undefined || _this2[sub].__link && _this2[sub].__link(state) === undefined || _this2[sub].getState() !== subResult) {
						if (result === undefined) {
							result = state instanceof Array ? [].concat(_toConsumableArray(state)) : _extends({}, state);
						}
						_this2[sub].__link(result, subResult);
					}
				});
				return this.__state = result || state;
			}
		}]);
	
		return Api;
	})();
	
	exports.default = Api;
	function link(parent, child) {
		var link = arguments.length <= 2 || arguments[2] === undefined ? apiLink : arguments[2];
	
		child.__parent = parent;
		if (parent instanceof Api) child.__link = link.bind(child);
		return child;
	}
	
	function onload(fn) {
		return function (Component) {
			Component.onload = fn;return Component;
		};
	}
	
	function load(components, params) {
		return Promise.all(components.filter(function (component) {
			return component.onload;
		}).map(function (component) {
			return component.onload(params);
		}).filter(function (result) {
			return result instanceof Promise;
		}));
	}
	
	function apiLink(parentState, childState) {
		return childState === undefined ? (typeof parentState === 'undefined' ? 'undefined' : _typeof(parentState)) == 'object' && this.__parent ? parentState[childName(this.__parent, this)] : parentState : (typeof parentState === 'undefined' ? 'undefined' : _typeof(parentState)) == 'object' && this.__parent ? parentState[childName(this.__parent, this)] = childState : childState;
	}
	
	function childName(parent, child) {
		var names = Object.keys(parent);
		for (var i = 0, name; name = names[i]; i++) {
			if (parent[name] === child) return name;
		}
	}
	
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

/***/ }
/******/ ])
});
;
//# sourceMappingURL=redux-apis.umd.js.map