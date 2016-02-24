export class Api {
	constructor(state = {}) {
		Object.defineProperties(this, {
			__actionHandlers: { value: {} },
			__state: { value:state, writable:true },
			__dispatch: { value: (action) => {
				if (typeof action == 'function') {return action(this.dispatch.bind(this), this.getState.bind(this));}
				state = this.reducer(state, action);
				return action;
			}},
			__parent: { value: undefined, writable: true },
			__link: { value: undefined, writable: true },
			connector: { value: this.connector.bind(this) },
			reducer: { value: this.reducer.bind(this) },
		});
	}

	init() {
		this.dispatch(this.createAction('@@redux/INIT')());
		return this;
	}

	getState() {
		return this.getParent()
			? (this.__link ? this.__link(this.getParent().getState()) : this.getParent().getState())
			: this.__state;
	}

	getParent() {
		return this.__parent;
	}

	setHandler(actionType, handler) {
		this.__actionHandlers[actionType] = handler;
	}

	getHandler(actionType) {
		return this.__actionHandlers[actionType];
	}

	clearHandler(actionType) {
		const result = this.__actionHandlers[actionType];
		delete this.__actionHandlers[actionType];
		return result;
	}

	createAction(actionType, payloadCreator, metaCreator) {
		return this.getParent() instanceof Api
				? this.getParent().createAction(name(this) + '/' + actionType, payloadCreator, metaCreator)
				: createAction(actionType, payloadCreator, metaCreator);
	}

	dispatch(action) {
		return this.__parent ? this.__parent.dispatch(action) : this.__dispatch(action);
	}

	reducer(state, action) {
		const idx = action.type.indexOf('/');
		const subAction = idx !== -1 && action.type.substring(0, idx);
		let result = this.__actionHandlers[action.type]
			? this.__actionHandlers[action.type].call(this, state, action)
			: (state === undefined ? this.__state : undefined);
		const subs = Object.keys(this).filter(key => this[key] instanceof Api);
		subs.forEach(sub => {
			const act = sub !== subAction ? action : {...action, type:action.type.substring(idx + 1)};
			const subResult = this[sub].reducer(this[sub].__link(state), act);
			if (state === undefined || this[sub].__link && this[sub].__link(state) === undefined || this[sub].getState() !== subResult) {
				if (result === undefined) {
					result = state instanceof Array
						? [ ...state ]
						: { ...state };
				}
				this[sub].__link(result, subResult);
			}
		});
		return this.__state = result || state;
	}

	connector(state, ownProps) {
		return { ...ownProps, ...this.getState(), api:this };
	}
}
export default Api;

export function link(parent, child, link = apiLink) {
	child.__parent = parent;
	child.__link = link.bind(child);
	return child;
}

export function apiLink(parentState, childState) {
	const n = name(this);
	return childState === undefined
			? (parentState !== undefined && n ? parentState[n] : parentState)
			: (n ? parentState[n] = childState : Object.assign(parentState, {...childState}));
}

export function namedLink(name) {
	return (parentState, childState) => childState === undefined
			? (parentState !== undefined ? parentState[name] : undefined)
			: parentState[name] = childState;
}

function name(child) {
	const parent = child.getParent();
	let names = parent ? Object.keys(parent) : [];
	for (let i=0,name; name=names[i]; i++) {
		if (parent[name] === child) return name;
	}
}

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
