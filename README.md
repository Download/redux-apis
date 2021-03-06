﻿![version](https://img.shields.io/npm/v/redux-apis.svg) ![license](https://img.shields.io/npm/l/redux-apis.svg) ![installs](https://img.shields.io/npm/dt/redux-apis.svg) ![build](https://img.shields.io/travis/Download/redux-apis.svg) ![mind BLOWN](https://img.shields.io/badge/mind-BLOWN-ff69b4.svg)

# redux-apis <sub><sup>v1.1.1</sup></sub>

[![Greenkeeper badge](https://badges.greenkeeper.io/Download/redux-apis.svg)](https://greenkeeper.io/)

**Helpers for creating Redux-aware APIs**


## Installation

```sh
npm install --save redux-apis
```

## Usage

* [Use Apis shared by the community](#use-apis-shared-by-the-community)
* [Create your own APIs](#create-your-own-apis)
* [Compose existing APIs into new ones](#compose-existing-apis-into-new-ones)
* [Link the top-level Api to a Redux store](#link-the-top-level-api-to-a-redux-store)
* [Use redux-apis with React components](#use-redux-apis-with-react-components)
* [Scoped isomorphic fetch with redux-fetch-api](#scoped-isomorphic-fetch-with-redux-fetch-api)
* [Async actions with redux-async-api](#async-actions-with-redux-async-api)
* [Server-side rendering with redux-load-api](#server-side-rendering-with-redux-load-api)
* [Use redux-apis with Hot Module Replacement](#use-redux-apis-with-hot-module-replacement)


### Use Apis shared by the community

I'm hoping for `redux-apis` to become a community-driven project to further the use
of Redux and React. Read [Share your Api](#share-your-api) at the bottom of this page
to learn how to contribute and get your Api listed here.

* [redux-async-api](https://www.npmjs.com/package/redux-async-api)
* [redux-fetch-api](https://www.npmjs.com/package/redux-fetch-api)
* [redux-load-api](https://www.npmjs.com/package/redux-load-api)


### Create your own APIs

`redux-apis` let's us create APIs that will feel very natural to consuming code and that completely
hide that redux is being used under the hood.

#### Extend from Api
To create an API, we extend from the class `Api` or one of it's descendants.

```js
import Api from 'redux-apis';

export default class DrawerApi extends Api {
	// ...
}
```

#### Create properties
An Api automatically gets it's own private slice of the Redux state tree, accessible via
`this.getState()`. But that state can often be very 'raw'. It should be in it's most
'normalized' form (e.g. no derived state), which can make it hard to work with.
By implementing properties that inspect, but do not manipulate, the state tree,
we can make custom properties that are interesting to the outside world. We can make
these properties read-only by only providing a getter for them, and we can make the
'public' by specifying that they should be `enumerable`:

```js
export default class DrawerApi extends Api {
  constructor(state) {
	super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});
  }
}
```

The code above assumes that our state has a boolean flag `open`... But we need to provide
that initial state.

#### Provide initial state
We provide initial state by setting a default value for the `state` parameter of the constructor:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});
  }
}
```

If we intend our Api class to be derived from, we can publish the initial state
so the extending Api can make use of it:

```js
export default class Base extends Api {
  static INITIAL_STATE = { base: 'basic' };
  constructor(state = Base.INITIAL_STATE) {
    super(state);
  }
}

export default class Derived extends Api {
  static INITIAL_STATE = { ...Base.INITIAL_STATE, derived:'extended' };
  constructor(state = Derived.INITIAL_STATE) {
    super(state);
  }
}

new Derived().init().getState(); // { base: 'basic', derived:'extended' }
```

#### Create manipulators
To manipulate the state tree, we provide methods that create and dispatch an action:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});
  }

  openDrawer() {
    this.dispatch(this.createAction('OPEN')());
  }
}
```

Note the second pair of braces in the call to `createAction`. This pattern is copied from
[redux-actions](https://github.com/acdlite/redux-actions)... Heck, the code itself is
copied from `redux-actions`! ;) The resulting actions follow the
[Flux Standard Action](https://github.com/acdlite/flux-standard-action) format.

#### Register action handlers
We then register *handlers* for these actions in the constructor:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});

    this.setHandler('OPEN', function handleOpen(state, action) {
      return { ...state, open: true };
    });
  }

  openDrawer() {
    this.dispatch(this.createAction('OPEN')());
  }
}
```

Note that `handleOpen` returns a *new* object. We *never* mutate the existing state, but always
either return it unchanged, or return a new object. We initialize the new object with the current
state using the ES6 spread operator `...` to copy all state properties to the new object. Then we
overwrite the `open` property with the new value. Copying the current state is not strictly needed
in this example as there are no other properties, but writing your code like this ensures it will
keep working when you decide to add more state properties later, or when the class is derived from.

#### Finishing up our first Api
Let's add a close command to finish our first Api. We'll also use arrow functions to make the
code a bit more elegant:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});
    this.addHandler('OPEN', (state, action) => ({ ...state, open: true }));
    this.addHandler('CLOSE', (state, action) => ({ ...state, open: false }));
  }

  openDrawer() {
    this.dispatch(this.createAction('OPEN')());
  }

  closeDrawer() {
    this.dispatch(this.createAction('CLOSE')());
  }
}
```

The cool thing is that we now already have a working API. No redux store is needed
to make it work, because Api objects will maintain their own state when not connected
to a Redux store. This is helpful when testing:

```js
var api = new DrawerApi().init();
```

Note how we call `init()` on the new instance. This initializes the state tree by sending it an
INIT action. If you use Api objects independently from Redux, you are responsible
for initializing them yourself, by calling `init` on the top-level Api. If you bind your Api to
a Redux store, this is done automatically by the Redux store.

Now that we have an initialized Api, we can use it:

```js
console.assert(api.open === false, 'Initially, the drawer should be closed');
api.openDrawer();
console.assert(api.open === true, 'After calling openDrawer(), the drawer should be open');
api.closeDrawer();
console.assert(api.open === false, 'After calling closeDrawer(), the drawer should be closed');
```

Because the `Api` constructor accepts a state argument, we can also initialize it manually:

```js
const leftDrawer = new DrawerApi({open: true}).init();
console.assert(leftDrawer.open === true, 'The left drawer should be open');
```


### Compose existing APIs into new ones

Because each Api has it's own state slice, we can easily use the same Api multiple times.
We use the function `link(parent, child, link = apiLink)` for this purpose.

```js
import Api, { link } from 'redux-apis';
import DrawerApi from './DrawerApi';

class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi());
    this.rightDrawer = link(this, new DrawerApi());
  }
}

const app = new AppApi().init();
```

That's it! `app` now automatically has a state tree that looks like this:

```js
{
  leftDrawer: {
    open: false,
  },
  rightDrawer: {
    open: false,
  },
}
```

We can use `app` like this:

```js
app.leftDrawer.openDrawer();
console.assert(app.leftDrawer.open === true, 'The left drawer should be opened');
```

#### Action types are namespaced
The example above works, because `Api.createAction`, `Api.dispatch` and `Api.reducer` all follow
the same naming conventions and are aware of the (state) hierarchy via the link created with the
`link` function. When you call `createAction` with an `actionType` argument, it checks for a link
to a parent Api and, if it's set, prepends the parent Api's name and a slash to the `actionType`
before passing it on to it's parent. So in the example above, when we called
```js
appApi.leftDrawer.openDrawer()
```
it actually resulted in an action being created with `actionType` equal to
```js
'leftDrawer/OPEN'
```
`dispatch` then passes that action along to it's parent, all the way to the top-level. From there,
`reducer` is invoked and is doing the opposite; it's breaking the `actionType` apart into separate
parts and routing the action to it's destination. Along the way, 'reducer' will be invoked on all
nodes of the state tree. If it finds a registered handler for the action, it invokes that and returns
it's result. Otherwise, it returns the current state, or the (default) initial state. The side effect
of this is that we can initialize the entire state tree by just sending it an action that it does not handle.
This is exactly what `init()` does; it dispatches an action with type `'@@redux/INIT'`. Redux itself
does it exactly the same way.

#### Api as a mini-store
In fact, `Api` mimics the api of a redux store, so that conceptually we are building a hierarchy of
redux-like `mini-stores` that maps onto the state tree, each store in the hierarchy managing it's own
private slice.

#### The `link` parameter
`link` has a third parameter, also called `link`, that allows us to customize how the state slice
of the child is extracted from the parent state. By default, it's using `apiLink`, which dynamically
finds the name of the child api within it's parent and uses that name to select the right property
from the state slice. This creates a 1 to 1 mapping:

```js
class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi());
    this.rightDrawer = link(this, new DrawerApi());
  }
}
```

maps to

```js
{
  leftDrawer: {
    open: false,
  },
  rightDrawer: {
    open: false,
  },
}
```

However, we can customize this by creating a function that accepts two arguments, `parentState`
and `childState` and that performs the mapping. This function should be read/write; meaning it should
be able to 'select' the child state from the `parentState`, as well as 'update' the parent state
based on the `childState`. Let's look at an example. Suppose we want to map the leftDrawer Api onto
the state key `drawer` instead of `leftDrawer`. We could do this:

```js
class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi(),
      (parentState, childState) => childState === undefined
          ? parentState && parentState.drawer
          : parentState.drawer = childState
    );
    this.rightDrawer = link(this, new DrawerApi());
  }
}
```

maps to

```js
{
  drawer: {
    open: false,
  },
  rightDrawer: {
    open: false,
  },
}
```

Inside the link function, you have access to the child element via the `this`
keyword, so we could also have done this:

```js
class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi(),
      (parentState, childState) => childState === undefined
        ? parentState && parentState[this.alias]
        : parentState[this.alias] = childState
    );
    this.leftDrawer.alias = 'drawer';
    this.rightDrawer = link(this, new DrawerApi());
  }
}
```

Finally, for this common scenario, there is a helper function `namedLink` that
will create the linker function for us . We could have used it like this:

```js
class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi(), namedLink('drawer'))
    this.rightDrawer = link(this, new DrawerApi());
  }
}
```

Easy isn't it?


### Link the top-level Api to a Redux store

Until now, Redux never came into play. And in fact you don't need it.
`redux-apis` has no runtime dependency on redux and can actually be
used without Redux itself! The handlers you registered are reducers
and `Api.reducer` acts like a generic reducer routing the incoming
actions to the registered handlers. This is very convenient for testing.
But using Redux has many advantages. There is a lot of `middleware`
available for it; small pieces of code that hook into the redux control
flow. Things like [redux-thunk](https://github.com/gaearon/redux-thunk)
to allow us to dispatch functions (for async handling for example) and
[redux-logger](https://github.com/fcomb/redux-logger) that allows us to
log all dispatched actions. Also, redux gives us a subscription model
for listening to store events.

Here is how you link an Api to a redux store:

```js
import { link } from 'redux-apis';
import { createStore } from 'redux';
import AppApi from './AppApi';

// First, create your top-level Api object, but don't initialize it
// the redux store will take care of that
const app = new AppApi();
```

The cool thing is that `app.reducer` is a Redux reducer! It is auto-bound
to the `app` instance, so we can just pass it along to `createStore` to
make redux call it:

```js
// We can create a Redux store just like we always do. Just pass app.reducer!
let initialState = { some: 'state' }; // optional
const store = createStore(app.reducer, initialState);
```

Almost there. In fact, our app has already been initialized with either the
supplied initial state, or the initial state encoded in our Api components.
We just need to link back the app object to the redux store, so dispatched
actions will be routed to the redux store:

```js
link(store, app);
```

There you go!

In this example we are linking the app reducer as the sole root reducer.
But in fact it's a reducer just like any other so we are able to combine
it together with other reducers using redux's `combineReducers`, or any
of the other methods available.

```js
const reducer = combineReducers({
	thirdparty: thirdpartyReducer,
	app: app.reducer,
});

export const store = createStore(reducer, data);
```

When the root Api is not mounted to the root of the redux store state tree,
as in the example above where it is linked to the `'app'` key, we need to
inform it on how to get it's own slice of the state tree. We can do this by
providing a third argument to `link`, which is a function that gets/sets the
child state from/into the parent state. We use `namedLink` here, which is a
function that returns such a linker function based on a simple name:

```js
// link app to store, getting state from key 'app'
link(store, app, namedLink('app'));
```

When we don't supply a third argument to `link`, the default `apiLink` is used.
It just tries to find the child object among the parent's properties and then
uses the name of that property as the key of the state slice. We can use this
fact to simplify the above code to:

```js
// link(store, app, namedLink('app'));
// equavalent to:
store.app = link(store, app);
// key name 'app' is implied from the fact that the app
// is on a property named 'app' on the parent object.
```

We are currently using the vanilla `createStore` from redux, but we could
boost that with middleware in exactly the same way we always do with redux.
`redux-api` is just another component, latching onto the redux store with a
plain old reducer function. Simple!


### Use redux-apis with React components

The standard way of linking React components to a redux store is with
the `connect` decorator from [react-redux](https://github.com/rackt/react-redux)
and that does not change if you use redux-apis. But Api's do offer
a convenience method `connector`, which, like `reducer`, is auto-bound
to it's Api instance, making connecting a Redux Api instance to a
React component as simple as:

```js
import React, { Component } from 'react';
import { connect } from 'react-redux';
import app from './app'; // exports some Api instance

@connect(app.connector)
class App extends React.Component {
  render() {
    // when we get here, `connect` will have called `app.connector`, which will
    // have made all enumerable properties of `app` available in `this.props`
    const { some, api, properties } = this.props;
  }
}
```js

`app.connector` returns an object with the enumerable properties from `app` in
it, making them available for use in the React component. But by default, Api
instances have no enumerable properties. So in order to have the properties
`some`, `api` and `properties` from the example above be added to props, we should
make them available on our Api. As an example, let us implement `./app.js` from
the example above:

```js
import Api from 'redux-apis';
export class AppApi extends Api {
  constructor(state = {some:'initial', api:'state', properties:'values'}) {
    super(state);
	defineProperty(this, 'some', {enumerable:true, get:()=>this.getState().some});
	defineProperty(this, 'api', {enumerable:true, get:()=>this.getState().api});
	defineProperty(this, 'properties', {enumerable:true, get:()=>this.getState().properties});
  }
}
```

This is a very simple example, but the use of enumerable properties will both
give us fine grained control on the one hand, as well as very convenient and
natural use on the other hand. For example, manually passing all enumerable
properties of an instance of `DrawerApi`, to a React component named `Drawer`
is as simple as:

```js
import React, { Component } from 'react';
import Drawer from './components/Drawer';
import DrawerApi from './components/Drawer/api';

const drawer = new DrawerApi().init();

class App extends Component {
  render() {
    return <Drawer {...drawer}>;
	// equavalent to
	// return <Drawer open={drawer.open} />
  }
}
```

I've found that many React components accept event handlers for things like
some button being pressed. Assume our React `Drawer` component accepts a
listener for when the darkened background is clicked in order to close the
drawer, and that it has a property `onCancel` that can be used to set that
listener. Knowing this, we can change our DrawerApi to reflect this:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
	Object.defineProperty(this, 'open', {enumerable:true, get: () => this.getState().open});

	// Add a property `onCancel`, which is a version of `closeDrawer`, auto-bound to `this`
	Object.defineProperty(this, 'onCancel', {enumerable:true, value: this.closeDrawer.bind(this)});

    this.addHandler('OPEN', (state, action) => ({ ...state, open: true }));
    this.addHandler('CLOSE', (state, action) => ({ ...state, open: false }));
  }

  openDrawer() {
    this.dispatch(this.createAction('OPEN')());
  }

  closeDrawer() {
    this.dispatch(this.createAction('CLOSE')());
  }
}
```

Now, this line of code in the React `App` component will pass both the `open` and `onCancel`
properties to the React `Drawer` component:

```js
<Drawer {...drawer}>;
```

I think you can that in this manner we can easily create Api objects that are loosely coupled
to their counterpart React components, but still integrate with them very nicely.

**NOTE**: In versions of redux-apis prior to v1.1.0, `connector` used to return an object
containing the api state plus a property `api`, referencing the Api object itself. From 1.1.0
going forward, the enumerable properties of the Api object are being *added* to this. This
will continue to be like this in the 1.x branch, but when version 2.x arrives, the old behavior
will be removed and only the enumerable properties will remain. So consider the old behavior to
be deprecated.


### Scoped isomorphic fetch with redux-fetch-api

Often, we want to fetch data from a remote server. Our api should be mapped to some remote
endpoint. We also see that remote endpoints tend to be hierarchically structured:
```
http://example.com/api
http://example.com/api/products
http://example.com/api/products/details
http://example.com/api/products/create
http://example.com/api/products/update
http://example.com/api/people
http://example.com/api/people/search
etc
```

`redux-fetch-api` is a small library designed to work well with redux-apis,
that allows you to decorate your apis with a scoped, isomorphic `fetch` method.

Using the tools from `redux-fetch-api`, we can map our api hierarchy onto a
remote endpoint very easily:

```js
@remote
class Module extends Api {
  doIt() {
    return this.fetch('/something');
  }
}

@remote('http://example.com')
class App extends Api {
  constructor(state) {
    super(state);
    this.moduleA = remote('/modA')(
		link(this, new Module())
	);
    this.moduleB = remote('/modB')(
		link(this, new Module())
	);
  }
}

const app = new App().init();
app.moduleA.doIt(); // fetches 'http://example.com/modA/something'
app.moduleB.doIt(); // fetches 'http://example.com/modB/something'
```

Check out [redux-fetch-api](https://www.npmjs.com/package/redux-fetch-api) for more details.


### Async actions with redux-async-api

redux-async-api is a good fit for when you need to perform async actions, such as remote server
calls (also keep an eye on [redux-fetch-api](https://github.com/download/redux-fetch-api)
for isomorphic fetch). In the spirit with the rest of this library and redux, we build on
top of the basic building blocks for async with redux: [thunk](https://github.com/gaearon/redux-thunk)
and [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

Using `onload` and `load` from `redux-load-api` (see next chapter) we can attach loader functions
to (React) components and wait for the promises they return to fulfill. All we need then, is
some mechanism to keep track of the state of the async operation in the redux store.

Enter `Async`:

```js
class MyAsync extends Async {
  static INITIAL_STATE = { ...Async.INITIAL_STATE, result:'pending...' };

  constructor(state = MyAsync.INITIAL_STATE) {
    super(state);
    this.setHandler('SET_RESULT', (state, action) => ({...state, result:action.payload}));
	Object.defineProperty(this, 'result', {enumerable:true, get:()=>this.getState().result});
  }

  setResult(result) {
    return this.dispatch(this.createAction('SET_RESULT')(result));
  }

  run() {
    this.setBusy();
    this.setResult('busy...');
    return new Promise((resolve) => {
	  // do async work, here simulated with `setTimeout`
      setTimeout(() => {
        this.setDone();
        this.setResult('Done!');
        return resolve();
      }, 0);
    });
  }
}
```

As you can see we only need to implement our business-specific logic and can
just call `Async`'s setters to update the async state flag.

For more information refer to [redux-async-api](https://github.com/download/redux-async-api).


### Server-side rendering with redux-load-api

The community package [redux-load-api](https://npmjs.com/package/redux-load-api) offers two
functions designed to simplify server-side rendering of React components: `@onload` and `load`.

These allow us to do this:

```js
class AppApi extends Api {someFunc(someParam){}}
const app = new AppApi({someState:'some state'});

// decorate the `App` component with an onload
// function that calls `app.someFunc`
@onload(params => app.someFunc(params.someParam))
@connect(app.connector)
class App extends React.Component {
  render() {
    // ...
  }
}
```

Later, we can fire all load actions *and wait for them to complete* before
we render the page, assuring we sent a fully hydrated page to the client.
Assuming we are using react-router, it might look something like this:

```js
match({ routes, location:req.url }, (err, redirect, renderProps) => {
  if (renderProps) {
    // load finds all components decorated with `@onload`, calls the
    // load functions and collects any promises returned by them. it
    // then returns a promise that will fullfill once loading completes
    load(renderProps.routes.map(x => x.component), renderProps.params).then(() => {
      // at this point, the loader functions have been called on
      // those components matched by `match` that were decorated
      // with `onload` and any returned promises have been fulfilled.
    });
  }
  else {
    // redirect, error etc... refer to react-router docs
  }
});
```

Naturally, `@onload` and `load` mesh well with `redux-async-api` (previous chapter).

Refer to the documentation of [redux-load-api](https://github.com/Download/redux-load-api)
for more details.


### Use redux-apis with Hot Module Replacement

The Redux store holds all the state of the application, so we don't want to
destroy it, as this is essentially the same as completely reloading our
(single page) application. But we want to be able to replace the Api bound
to the store, because that will contain our work-in-progress application code.
Fortunately for us, Redux stores have a `replaceReducer` method that will let
us replace the root reducer with a different one, without having to recreate
the store. This means we can make a `const` store object and publish it to the
world, as it won't change during the lifetime of the application.

Using this information, here is how we can do Hot Module Replacement with `redux-apis`:

```js
import { createStore } from 'redux';
import { link } from 'redux-apis';

// use require i.s.o import
// don't use const as these components will be replaced
let AppApi = require('./AppApi').default;
let app = new AppApi();

// store object can be const. We can share it with the world, export it etc
const store = createStore(app.reducer);
link(store, app);
export default store;

if (module.hot) {
  module.hot.accept('./AppApi', () => {
    // re-create and re-link app object
    AppApi = require('./AppApi').default;
    app = new AppApi();
    store.replaceReducer(app.reducer);
    link(store, app);
  });
}
```

Easy isn't it? Our store's state survives! The app will continue exactly
where it left off, but with our new code loaded into it.


### Examples

Check out the `examples` folder for some examples including tests. Invoke

```sh
npm run examples
```

to run them.


### Start hacking

I invite you to hack on the examples a bit. It's probably the easiest way to get
started. Clone / fork this repo, then `cd` into the project root and invoke

```sh
npm install
```

Then, start a webpack development server by invoking

```sh
npm run examples-dev

> redux-apis@1.1.0 examples-dev c:\ws\redux-apis
> webpack-dev-server --context examples --output-filename redux-apis.examples.js "mocha!./index.jsx" --content-base examples --port 8889

http://localhost:8889/webpack-dev-server/
webpack result is served from /
content is served from c:\ws\redux-apis\examples
Hash: 3dfff65b899455e3b0c9
Version: webpack 1.12.12
Time: 2531ms
                     Asset    Size  Chunks             Chunk Names
    redux-apis.examples.js  579 kB       0  [emitted]  main
redux-apis.examples.js.map  700 kB       0  [emitted]  main
webpack: bundle is now VALID.
```
<sub>(Don't worry about those file sizes, that is due to the debug
/ hot reloading code. `redux-apis.min.js` weighs in at just ~2kB
minified and gzipped)</sub>

Point your browser to http://localhost:8889/webpack-dev-server/ and you
should see the mocha test suite, with all tests passing.

Now open the source files in the `examples` folder in your favourite
text editor. Make some changes and save. You should see the page hot-reload.
Start hacking away!


### Share your api

Built something great? Share it with the community and get it [listed](#use-apis-shared-by-the-community) on this repo.

* Name your package `redux-PACKAGENAME-api`
* Add the keyword `redux-apis` to the `keywords` section in `package.json`
* Publish your package to NPM
* Create a new issue here saying 'add package XYZ' or something like that
* Fork this repo and clone it to your machine
* Create and switch to a new branch
* Update this README, adding your package to the list
* Commit your changes, mentioning the full URL to the issue you created before in the commit comment
* Push to GitHub
* Create a Pull Request, mentioning the issue in the PR comment
* I will review your PR and merge it in


## Documentation

Please have a look at the [API documentation](docs/api.md).
Work in progress. Pull requests welcome!


## Feedback, suggestions, questions, bugs

Please visit the [issue tracker](https://github.com/download/redux-apis/issues)
for any of the above. Don't be afraid about being off-topic.
Constructive feedback most appreciated!


## Credits

My thanks goes out to these people. They are the giants on whose shoulders this library stands.
* [Dan Abramov](https://github.com/gaearon) for inventing the fantastic
   [redux](https://github.com/rackt/redux) state container and his great work on hot-reloading.
* [Andrew Clarke](https://github.com/acdlite) for [redux-actions](https://github.com/acdlite/redux-actions)
   and [flux-standard-action](https://github.com/acdlite/flux-standard-action), defining a convention
   for action objects that this library follows.
* [Athan Clark](https://github.com/athanclark) for asking very good questions and contributing valueable
   feedback, over Discord as well as the issue tracker. Thanks Athan!
* [Tim Dorr](https://github.com/timdorr), [Ryan Florence](https://github.com/ryanflorence),
   [Michael Jackson](https://github.com/mjackson) and [Jimmy Jia](https://github.com/taion) for
   their awesome work on [react-router](https://github.com/rackt/react-router).
* [Tobias Koppers](https://github.com/sokra) for the wonderful and versatile
   [webpack](https://github.com/webpack/webpack), and for his patience answering n00b webpack questions.
* [David Lents](https://github.com/dlents) for his constructive criticism that lead me to rethink the
   API and resulted in a much cleaner, better thought out approach.
* [Erik Rasmussen](https://github.com/erikras) for
   [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example),
   which provided great insight into setting up a universal app with react and redux.
* [Paul O’Shannessy](https://github.com/zpao) and countless other individuals giving us
   [react](https://github.com/facebook/react).
* [Mateusz Zatorski](https://github.com/knowbody) for helping me on Discord.
* [Yaroslav Sergievsky](https://github.com/everdimension), for giving me feedback and contributing the
   TwoStores example.


## Copyright

© 2016, [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.


## License

[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)
