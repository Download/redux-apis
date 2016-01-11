import { createAction } from 'redux-actions';

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
	}

	sub(name, api) {
		this[name] = new api();
		this[name].parent = this;
	}

	createAction(actionType, payload, ...args) {
		let name = childName(this.parent, this);
		if (name) {
			return this.parent.createAction(name + '/' + actionType, payload, ...args);
		}
		return createAction(actionType)(payload, ...args);
	}

	dispatch(action) {
		if (this.parent) {return this.parent.dispatch(action);}
		if (this.store) {return this.store.dispatch(action);}
		// root, but not connected to store, exec directly
		return this.state = this.execute(action);
	}

	execute(action) {
		const idx = action.type.indexOf('/');
		const sub = idx !== -1 && action.type.substring(0, idx);
		const subs = Object.keys(this);
		let result = this.handle(action);
		if (result === this.state) {result = undefined;}
		for (let i=0,key; key=subs[i]; i++) {
			if (key != 'parent' && this[key] instanceof Api) {
				let act = key !== sub ? action : { ...action, type: action.type.substring(idx + 1) };
				let subState = this[key].execute(act);
				if (!this.state || this.state[key] !== subState) {
					result ? result[key] = subState : result = { ...this.state, [key]: subState };
				}
			}
		}
		return result || this.state;
	}

	handle(action) {
		return this.state || {};
	}
}

export class RootApi extends Api {
	constructor(api) {
		super();
		this.api = new api();
		this.api.parent = this;
		this.reducer = this.reducer.bind(this);
	}

	bind(store, api) {
		this.store = store;
		if (api) {
			this.api = new api();
			this.api.parent = this;
		}
	}

	reducer(state, action) {
		return this.api.execute(action);
	}
}

function childName(parent, child) {
	if (parent && (! (parent instanceof RootApi))) {
		const siblings = Object.keys(parent);
		for (let i=0,name; name=siblings[i]; i++) {
			if (parent[name] === child) {return name;}
		}
	}
}

