// stolen from https://github.com/acdlite/redux-actions/blob/v0.9.0/src/createAction.js
export function createAction(type, actionCreator, metaCreator) {
  const finalActionCreator = typeof actionCreator === 'function' ? actionCreator : (t) => t;
  return (...args) => {
    const action = {type, payload:finalActionCreator(...args)};
    if (args.length === 1 && args[0] instanceof Error) {action.error = true;}
    if (typeof metaCreator === 'function') {action.meta = metaCreator(...args);}
    return action;
  };
}

export function childName(parent, child) {
	for (name of Object.keys(parent)) {
		if (parent[name] === child) return name;
	}
}

export function apiLink(parentState, childState) {
	return childState === undefined
		? parentState[childName(this.__parent, this)]
		: parentState[childName(this.__parent, this)] = childState;
}

export function storeLink(parentState, childState) {
	return childState === undefined
		? parentState
		: childState;
}

export function createReducer(api, link = storeLink) {
	api.__link = link.bind(api);
	return (state, action) => api.handle(api.__link(state), action);
}

export function link(parent, child, link = apiLink) {
	child.__parent = parent;
	child.__link = child.__link || link.bind(child);
	return child;
}

export class Api {
	constructor(state) {
		var handlers = {};
		Object.defineProperties(this, {
			__actionHandlers: { value: {} },
			__getState: { value: () => state },
			__dispatch: { value: (action) => {
				if (typeof action == 'function') {return action(this.dispatch.bind(this), this.getState.bind(this));}
				state = this.handle(this.getState(), action);
				return action;
			}},
			__parent: { value: undefined, writable: true },
			__link: { value: undefined, writable: true },
		});
	}

	dispatch(action) {
		return this.__parent ? this.__parent.dispatch(action) : this.__dispatch(action);
	}

	getState() {
		return this.__parent ? this.__link(this.__parent.getState()) : this.__getState();
	}

	createAction(actionType, payloadCreator, metaCreator) {
		return this.__parent
				? this.__parent.createAction(childName(this.__parent, this) + '/' + actionType, payloadCreator, metaCreator)
				: createAction(actionType, payloadCreator, metaCreator);
	}

	setHandler(actionType, handler) {
		this.__actionHandlers[actionType] = handler;
	}

	clearHandler(actionType) {
		delete this.__actionHandlers[actionType];
	}

	handle(state, action) {
		const idx = action.type.indexOf('/');
		const subAction = idx !== -1 && action.type.substring(0, idx);
		const subs = Object.keys(this).filter(key => this[key] instanceof Api2);
		let result = this.__actionHandlers[action.type]
			? this.__actionHandlers[action.type].call(this, state, action)
			: (state === undefined ? this.initialState() : undefined);
		subs.forEach(sub => {
			const act = sub !== subAction ? action : {...action, type:action.type.substring(idx + 1)};
			const subState = this[sub].handle(this[sub].getState(), act);
			if (state === undefined || this[sub].getState() !== subState) {
				if (result === undefined) {result = { ...state };}
				this[sub].__link(result, subState);
			}
		});
		return result || state;
	}

	initialState() {
		return {};
	}

	init() {
		this.dispatch(this.createAction('@@redux/INIT')());
		return this;
	}
}

export default Api;
