// stolen from https://github.com/acdlite/redux-actions/blob/v0.9.0/src/createAction.js
function createAction(type, actionCreator, metaCreator) {
  const finalActionCreator = typeof actionCreator === 'function' ? actionCreator : (t) => t;
  return (...args) => {
    const action = {type, payload:finalActionCreator(...args)};
    if (args.length === 1 && args[0] instanceof Error) {action.error = true;}
    if (typeof metaCreator === 'function') {action.meta = metaCreator(...args);}
    return action;
  };
}

export default class Api {
	constructor(state) {
		Object.defineProperty(this, 'state', {
			get: function() {
				if (this.parent) {
					const name = childName(this.parent, this);
					return name ? this.parent.state && this.parent.state[name] : this.parent.state;
				}
				if (this.store) {
					var result = this.store.getState();
					return result;
				}
				return state;
			},
			set: function(value) {
				if (!this.parent && !this.store) {
					state = value;
				}
			}
		});

		this.__handlers = {};
	}

	init() {
		this.dispatch(this.createAction('@@redux-apis/INIT')());
		return this;
	}

	sub(name, api) {
		this[name] = new api();
		this[name].parent = this;
	}

	createAction(actionType, actionCreator, metaCreator) {
		let name = childName(this.parent, this);
		if (name) {
			return this.parent.createAction(name + '/' + actionType, actionCreator, metaCreator);
		}
		return createAction(actionType, actionCreator, metaCreator);
	}

	dispatch(action) {
		if (this.parent) {return this.parent.dispatch(action);}
		if (this.store) {return this.store.dispatch(action);}
		if (typeof action == 'function') {return action(this.dispatch.bind(this), () => this.state);}
		this.state = this.handle(action);
		return action;
	}

	initialState() {
		return {};
	}

	handle(action) {
		const idx = action.type.indexOf('/');
		const sub = idx !== -1 && action.type.substring(0, idx);
		const subs = Object.keys(this);
		let result = typeof this.__handlers[action.type] == 'function'
			? this.__handlers[action.type].call(this, action)
			: this.state || this.initialState()
		if (result === this.state) {result = undefined;}
		for (let i=0,key; key=subs[i]; i++) {
			if (key != 'parent' && this[key] instanceof Api) {
				let act = key !== sub ? action : {...action, type:action.type.substring(idx + 1)};
				let subState = this[key].handle(act);
				if (!this.state || this.state[key] !== subState) {
					result ? result[key] = subState : result = {...this.state, [key]:subState};
				}
			}
		}
		return result || this.state;
	}

	addHandler(actionType, handler) {
		this.__handlers[actionType] = handler;
	}
}

export class RootApi extends Api {
	constructor(api, createStore, initialState) {
		super();
		this.bind(api);
		let reducer = (state, action) => {
			return !this.store && state ? state : this.__api.handle(action);
		}
		this.store = createStore(reducer, initialState);
	}

	bind(api) {
		if (this.__api) {
			apiKeys(this.__api).forEach((key) => delete this[key]);
			Object.keys(api).forEach((key) => delete RootApi[key]);
		}
		this.__api = new api();
		apiKeys(this.__api).forEach((key) => {
			this[key] = typeof this.__api[key] == 'function'
				? this.__api[key].bind(this.__api)
				: this.__api[key];
		});
		Object.keys(api).forEach((key) => RootApi[key] = api[key]);
		this.__api.parent = this;
	}
}

var RESERVED = Object.getOwnPropertyNames(Object.getPrototypeOf(new Api()))
	.concat(['parent', 'bind']);

function childName(parent, child) {
	if (parent && (! (parent instanceof RootApi))) {
		const siblings = Object.keys(parent);
		for (let i=0,name; name=siblings[i]; i++) {
			if (parent[name] === child) {return name;}
		}
	}
}

function apiKeys(obj) {
	return Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).concat(Object.keys(obj))
		.filter(function(key){return RESERVED.indexOf(key) === -1;});
}