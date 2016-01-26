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

	dispatch(action) {
		return this.__parent ? this.__parent.dispatch(action) : this.__dispatch(action);
	}

	getState() {
		return this.__parent
			? (this.__link ? this.__link(this.__parent.getState()) : this.__parent.getState())
			: this.__state;
	}

	createAction(actionType, payloadCreator, metaCreator) {
		return this.__parent instanceof Api
				? this.__parent.createAction(childName(this.__parent, this) + '/' + actionType, payloadCreator, metaCreator)
				: createAction(actionType, payloadCreator, metaCreator);
	}

	setHandler(actionType, handler) {
		this.__actionHandlers[actionType] = handler;
	}

	clearHandler(actionType) {
		delete this.__actionHandlers[actionType];
	}

	connector(state, ownProps) {
		return { ...this.getState(), ...ownProps, api:this };
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
}
export default Api;

export function link(parent, child, link = apiLink) {
	child.__parent = parent;
	if (parent instanceof Api) child.__link = link.bind(child);
	return child;
}

function apiLink(parentState, childState) {
	return childState === undefined
		? (typeof parentState == 'object' && this.__parent
			? parentState[childName(this.__parent, this)]
			: parentState)
		: (typeof parentState == 'object' && this.__parent
			? parentState[childName(this.__parent, this)] = childState
			: childState)
}

function childName(parent, child) {
	let names = Object.keys(parent);
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
