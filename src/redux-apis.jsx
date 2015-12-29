import { createAction } from 'redux-actions';

export default class Api {
	constructor(state) {
		Object.defineProperty(this, 'state', {
			get: function() {
				if (this.parent) {
					const name = childName(this.parent, this);
					return this.parent.state && this.parent.state[name];
				}
				if (this.store) {
					return this.store.getState();
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
		const name = this.parent && childName(this.parent, this);
		if (name) {
			return this.parent.createAction(name + '/' + actionType, payload, ...args);
		} else {
			return createAction(actionType)(payload, ...args);
		}
	}

	dispatch(action) {
		if (this.parent) {
			this.parent.dispatch(action);
		} else if (this.store) {
			this.store.dispatch(action);
		} else {
			// root, but not connected to store, exec directly
			this.state = this.execute(action);
		}
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

export function createReducer(instance) {
	return (state, action) => {
		return instance.execute(action);
	}
}

export function bind(instance, store) {
	instance.store = store;
}

function childName(parent, child) {
	const siblings = Object.keys(parent);
	for (let i=0,name; name=siblings[i]; i++) {
		if (parent[name] === child) {return name;}
	}
}

