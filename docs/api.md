# API documentation for redux-apis v1.1+

* [#class-api](class Api)
   * [#constructor-state------](constructor(state = {}))
   * [#-init](.init())
   * [#-getstate--](.getState())
   * [#-getparent--](.getParent())
   * [#-sethandler-actiontype--handler-](.setHandler(actionType, handler))
   * [#-getHandler-actiontype-](.getHandler(actionType))
   * [#-clearhandler-actionType-](.clearHandler(actionType))
   * [#-createaction-actionType--payloadCreator--metaCreator-](.createAction(actionType, payloadCreator, metaCreator))
   * [#-dispatch-action](.dispatch(action))
   * [#-reducer-state--action-](.reducer(state, action))
   * [#-connector-state--ownProps-](.connector(state, ownProps))
* [#link-parent--child--link---apiLink-](link(parent, child, link = apiLink))
* [#apilink-parentState--childState-](apiLink(parentState, childState))
* [#namedlink-name-](namedLink(name))


## class Api

Base class for creating Redux-aware APIs.

```js
export class Api { .. }
export default Api;
```

Defines an object that can either manage it's own state, or delegate it's
state management to a parent object that it is linked to using `link`.

This is the primary way of creating Redux-aware APIs with redux-apis; extend from `Api`:

```js
import Api from 'redux-apis';
class MyApi extends Api {
}
```

### constructor(state = {})
The constructor accepts a `state` parameter, allowing the initial state to
be passed to the new instance. By supplying a [default parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)
for `state`, we create a default initial state that the consuming code can
easily deviate from. The constructor is also the place where we usually create
and link any child apis and set up our action handlers.

```js
import Api from 'redux-apis';
class MyApi extends Api {
	constructor(state = {my:'default', initial:'state'}) {
		super(state);
		this.child = link(this, new ChildApi());
		this.setActionHandler('MY_ACTION', (state, action) => {...});
	}
}
```

### .init()

Initializes the state tree for this object and any `link`ed children
and returns `this` (for chaining purposes).

When an API hierarchy is used without Redux (e.g. in tests), call this
method to initialize the state tree manually. When used with Redux,
you do not need to call this method, as Redux will initialize the state
tree for us instead.

```js
const myApi = new MyApi().init();
myApi is initialized and ready for use
```


### .getState()

Returns (the part of) the state corresponding with this Api object.

```js
const state = this.getState();
```
The returned state may or may not be an immutable object, but should in any way
be treated as such. **Do not** mutate (part of) the returned state.


### .getParent()

Returns the parent of this Api object, or `undefined`.

```js
const parent = this.getParent();
```


### .setHandler(actionType, handler)

Sets the given `handler` function as the handler for actions of the given `actionType`.

```js
this.setHandler('MY_ACTION', myHandler);
```

The handler function should have the signature:

```js
function actionHandler(state, action)
```

The action handler should either return `state` unchanged, or return a
*new value* is the state changes due to this action.

You can think of a handler as a special-case *reducer* that only handles
a single action. Below the surface, the generic `.reducer(state, action)`
function on `Api` calls these handlers when needed.


### .getHandler(actionType)

Gets the handler currently assigned for the given `actionType`, if any.
This can be useful for chaining a new handler onto an existing one.

```js
function newHandler = (state, action) => ({...state, myFlag:action.payload});
const oldHandler = this.getHandler('MY_ACTION');
this.setHandler('MY_ACTION', (state, action) => {
	let newState = oldHandler ? oldHandler(state, action) : state;
	return newHandler(newState, action);
});
```

### .clearHandler(actionType)

Clears the handler currently assigned for the given `actionType`,
if any, and returns it.

```js
const oldHandler = this.clearHandler('MY_ACTION');
```


### createAction(actionType, payloadCreator, metaCreator)

Creates a new action, based on the given `actionType` and optional `payloadCreator` and `metaCreator`.

```js
// `createAction` returns an action *creator*, so usually we invoke that
// right away to get an actual action. Notice the second pair of braces
const myAction = this.createAction('MY_ACTION')();
// The second pair of braces accepts a payload object as argument
const myActionWithPayload = this.createAction('MY_ACTION')({my: 'payload'});
// We can customize how the payload is created from the arguments
const myActionCreator = this.createAction('MY_ACTION', (x, y, z) = ({x, y, z}));
const myAction = myActionCreator('X', 'Y', 'Z');
// myAction => {x:'X', y:'Y', z:'Z'}
```

In general, this method functions the same as `redux-actions`'
[createAction](https://github.com/acdlite/redux-actions#createactiontype-payloadcreator--identity-metacreator)
function, with one big difference. This method will **scope** the given `actionType` based
on the location of this Api object in the api hierarchy.

E.G. given this Api hierarchy:

```sh
app: AppApi
   + auth: AuthApi
   + contacts: ContactApi
      + edit: EditFormApi
```

If we call `createAction('MY_ACTION')()` from within the `app.contacts.edit` Api, the type of
the returned action will actually be:

```js
'contacts/edit/MY_ACTION'
```


### .dispatch(action)

Dispatches an action.

```js
this.dispatch(myAction);
```

This method will dispatch the given action object to this object's parent,
which might be the Redux store, or to this state tree if this object is at
the root of the hierarchy (e.g. in tests).


### .connector(state, ownProps)

Default selector function, auto-bound to this Api object, for use i.c.w.
`react-redux`' `connect` function.

```js
import React, { Component } from 'react';
import { createStore } from 'redux';
import Api, { link } from 'redux-apis';
import { connect } from 'react-redux';

class AppApi extends Api {
  constructor(state = {myFlag:false}) {
    super(state);
	this.setHandler('SET_FLAG', (state, action) => ({ ...state, flag: action.payload.flag }));
    Object.defineProperty(this, 'flag', {enumerable:true, get:()=>this.getState().myFlag});
    Object.defineProperty(this, 'toggle', {enumerable:true, value:this.toggleFlag.bind(this)});
  }
  setFlag(value) {
    return this.dispatch(this.createAction('SET_FLAG')(value));
  }
  toggleFlag() {
    return this.dispatch(this.createAction('SET_FLAG')(!this.flag));
  }
}
const app = new AppApi();
const store = createStore(app.reducer);
link(store, app);

@connect(app.connector)
export class App extends Component {
	render() {
		// all enumerable properties from app are available here in `this.props`
		const { flag, toggle, children } = this.props;
		return (
			<div className={flag ? 'my-flag' : ''} onClick={toggle}>
				{children}
			</div>
		)
	}
}
```

This example used the new [Javascript decorators](https://github.com/wycats/javascript-decorators) syntax.
If you don't want to use that yet, you could do this instead:

```js
class App extends Component { ... }
export connect(app.connector)(App);
```


### .reducer(state, action)

Default, auto-bound `reducer` function that can be used the same way you would normally use reducers.

This is the function we use to bind the Api to the redux store:

```js
const store = createStore(app.reducer, {initial: 'state'});
link(store, app);
```

If you don't want to link the app at the root of the store and/or you want to combine other
reducers into the mix, you use the normal patterns for redux for applying middleware and
composing reducers, like this (example of using `redux-thunk` and `redux-responsive`):


```js
import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import thunk from 'redux-thunk';
import { responsiveStateReducer, responsiveStoreEnhancer } from 'redux-responsive';
import { link, namedLink } from './redux-apis';

import app from './components/App/api';

const reducer = combineReducers({
	browser: responsiveStateReducer,
	app: app.reducer,
});

export const store = createStore(reducer, data, compose(
	responsiveStoreEnhancer,
	applyMiddleware(
		thunk
	)
))

// link the store to the app
link(store, app, namedLink('app'));
```

When the root Api is not mounted to the root of the redux store state tree, we provide
a third argument to `link`, which is a function that gets/sets the child state from/into
the parent state. We use `namedLink` here, which is a function that returns such a linker
function based on a simple name.

## link(parent, child, link = apiLink)

```js
export function link(parent, child, link = apiLink)
```

Links a child Api object to it's parent, using the given `link` function to get/set the
child state from/into the parent state:

```js
this.child = link(this, new ChildApi());
```

By default, `link` will use `apiLink`, which assumes that the names of the state
objects correspond with the names of the child Api objects within the parent object.
If that assumption does not work, you can provide your own linker function which
needs to have this signature:

```js
link(parentState, childState)
```

This function can be called in two ways:

1. `childState === undefined`: should return the child state slice from the `parentState`
2. `childState !== undefined`: should set the child state in `parentState`, then return `childState`

When the `getState` method of the child Api needs to retrieve the child's state
slice from the parent's state, it calls the child's `link` to get it, passing
the result of the parent's `getState()` as the `parentState` and `undefined` as
the `childState` *(1)*.

When the parent Api wants to process the result of one of it's children's
reducers, it creates a new result state and passes that and the updated child
state to the child's `link` *(2)*. That will then apply the update of the parent
state object.

This way the knowledge of where a state slice lives inside a bigger state slice
is all centralized in this one simple function, opening the doors for Api objects
to be easily composable.

A typical linker function looks something like this:

```js
function myStateLink(parentState, childState) {
	return childState === undefined
		? parentState['myState']
		: parentState['myState'] = childState;
}
```

Inside the linker function, `this` refers to the child object and the parent is
accessible via `this.getParent()`. This makes it easy to use properties of either
of these objects to determine what to do. The `apiLink` makes use of this to
figure out the name of the child api within the parent.


### apiLink(parentState, childState)

```js
export function apiLink(parentState, childState)
```

The default link function used when you don't supply a third argument to `link`.
Finds the child api within the parent, then uses the name of the property it
found as the key for the state slice.


### namedLink(name)

```js
export function namedLink(name)
```

Creates a simple linker function like the one in the example above, but based on
the given `name`. Use this if you are faced with a situation where you cannot use
the default `apiLink`, for example when wanting to map an Api onto a key with a
name with symbols in it that cannot be used in Javascript identifiers:

```js
this.myApi = link(this, new MyApi(), namedLink('my-api'));
```
