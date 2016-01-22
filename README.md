![version](https://img.shields.io/npm/v/redux-apis.svg) ![license](https://img.shields.io/npm/l/redux-apis.svg) ![Package Quality](http://npm.packagequality.com/shield/redux-apis.svg) ![installs](https://img.shields.io/npm/dt/redux-apis.svg) ![build](https://img.shields.io/travis/download/redux-apis.svg) ![mind BLOWN](https://img.shields.io/badge/mind-BLOWN-brightgreen.svg)

# redux-apis <sub><sup>v0.10.3</sup></sub>

**Helpers for creating Redux-aware APIs**


## Installation

```sh
npm install --save redux-apis
```


## Usage

* [Create APIs](#create-apis)
* [Compose existing APIs into new ones](#compose-existing-apis-into-new-ones)
* [Link the top-level Api to a Redux store](#link-the-top-level-api-to-a-redux-store)
* [Use redux-apis with Hot Module Replacement](#use-redux-apis-with-hot-module-replacement)

### Create APIs

`redux-apis` let's us create APIs that will feel very natural to consuming code and that completely
hide that redux is being used under the hood. To create an API, we extend from the class `Api`.

```js
import Api from 'redux-apis';

export default class DrawerApi extends Api {
	// ...
}
```

An Api automatically gets it's own private slice of the Redux state tree, accessible via
`this.getState()`. Using this we can easily implement getters:

```js
export default class DrawerApi extends Api {
  isOpen() {
    return this.getState().open;
  }
}
```

The code above assumes that our state has a boolean flag `open`... But we need to provide
that initial state. We do so by adding a constructor with a default value for the `state` parameter:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
  }

  isOpen() {
    return this.getState().open;
  }
}
```

To manipulate the state tree, we provide methods that create and dispatch an action:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
  }

  isOpen() {
    return this.getState().open;
  }

  open() {
    this.dispatch(this.createAction('OPEN')());
  }
}
```

Note the second pair of braces in the call to `createAction`. This pattern is copied from
[redux-actions](https://github.com/acdlite/redux-actions)... Heck, the code itself is
copied from `redux-actions`! ;) The resulting actions follow the
[Flux Standard Action](https://github.com/acdlite/flux-standard-action) format.

We then register *handlers* for these actions in the constructor:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);

    this.setHandler('OPEN', function handleOpen(state, action) {
      return { ...state, open: true };
    });
  }

  isOpen() {
    return this.getState().open;
  }

  open() {
    this.dispatch(this.createAction('OPEN')());
  }
}
```

Note that `handleOpen` returns a *new* object. We *never* mutate the existing state, but always
either return it unchanged, or return a new object. We initialize the new object with the current
state using the ES6 spread operator `...` to copy all state properties to the new object, then
overwrite the `open` property with the new value. Copying the current state is not strictly needed
in this example as there are no other properties, but writing your code like this ensures it will
keep working when you decide to add more state properties later.

Let's add a `close` command to finish our first Api. We'll also use arrow functions to make the
code a bit more elegant:

```js
export default class DrawerApi extends Api {
  constructor(state = { open: false }) {
    super(state);
    this.addHandler('OPEN', (state, action) => ({ ...state, open: true }));
    this.addHandler('CLOSE', (state, action) => ({ ...state, open: false }));
  }

  isOpen() {
    return this.getState().open;
  }

  open() {
    this.dispatch(this.createAction('OPEN')());
  }

  close() {
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
console.assert(api.isOpen() === false, 'Initially, the drawer should be closed');
api.open();
console.assert(api.isOpen() === true, 'After calling open(), the drawer should be open');
api.close();
console.assert(api.isOpen() === false, 'After calling close(), the drawer should be closed');
```

Because the `Api` constructor accepts a state argument, we can also initialize it manually:

```js
const leftDrawer = new DrawerApi({open: true});
console.assert(leftDrawer.isOpen() === true, 'The left drawer should be open');
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
app.leftDrawer.open();
console.assert(app.leftDrawer.isOpen() === true, 'The left drawer should be opened');
```

This works, because `Api.createAction`, `Api.dispatch` and `Api.handle` all follow the same naming
conventions and are aware of the hierarchy via the `parent` property. When you call `createAction`
with an `actionType` argument, it checks the `parent` property and, if it's set, prepends it's name
and a slash to the `actionType` before passing it on to it's parent. So in the example above, when
we called `appApi.leftDrawer.open()`, it actually resulted in an action being created with
`actionType` equal to `'leftDrawer/OPEN'`. `dispatch` then passes that action along to it's parent,
all the way to the top-level. From there, `handle` is invoked and is doing the opposite; it's
breaking the `actionType` apart into separate parts and routing the action to it's destination.
Along the way, 'handle' will be invoked on all nodes of the state tree. If it finds a registered
handler for the action, it invokes that and returns it's result. Otherwise, it returns the current
state, or, if that's not defined, invokes `initialState` and returns that. The side effect of this
is that we can initialize the entire state tree by just sending it an action that it does not handle.
This is exactly what `init()` does; it dispatches an action with type `'@@redux/INIT'`. Redux
does it exactly the same way.

In fact, `Api` mimics the api of a redux store, so that conceptually we are building a hierarchy of
redux-like `stores` that maps onto the state tree, each store in the hierarchy managing it's own
private slice.

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
          ? parentState.drawer
          : parentState.drawer = childState;
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

Inside the link function, you have access to the child element via the `this` keyword, so we could also
have done this:

```js
class AppApi extends Api {
  constructor(state) {
    super(state);
    this.leftDrawer = link(this, new DrawerApi(),
      (parentState, childState) => childState === undefined
        ? parentState[this.alias]
        : parentState[this.alias] = childState;
    );
    this.leftDrawer.alias = 'drawer';
    this.rightDrawer = link(this, new DrawerApi());
  }
}
```

### Link the top-level Api to a Redux store

Until now, Redux never came into play. And in fact you don't need it. `redux-apis` has no runtime
dependency on redux and can actually be used without Redux itself! The handlers you registered
are reducers and `Api.handle` acts like a generic reducer routing the incoming actions to the
registered handlers. This is very convenient for testing. But using Redux has many advantages.
There is a lot of `middleware` available for it; small pieces of code that hook into the redux
control flow. Things like [redux-thunk](https://github.com/gaearon/redux-thunk) to allow us to
run code whenever an action is dispatched (for async handling for example) and
[redux-logger](https://github.com/fcomb/redux-logger) that allows us to log all dispatched actions.
Also, redux gives us a subscription model for listening to store events.

Here's how we hook an API to a redux store:

```js
import { link } from 'redux-apis';
import { createStore } from 'redux';
import AppApi from './AppApi';

// First, create your top-level Api object, but don't initialize it
// the redux store will take care of that
const app = new AppApi();

// The cool thing is that app.handle is a reducer!
// We only have to `bind` it to make the `this` reference work correctly:
const reducer = app.handle.bind(app);

// Now, we can create a Redux store just like we always do:
const initialState = { some: 'state' }; // optional
const store = createStore(reducer, initialState);

// Allmost there. In fact, our app has already been initialized
// with either the supplied initial state, or the initial state
// encoded in our Api components.
// We just need to link the app object to the redux store, so
// dispatched actions will be routed to the redux store:
link(store, app);
```

There you go!

In this example we are linking the api reducer as the sole root reducer.
But in fact it's a reducer just like any other so we are able to combine
it together with other reducers using redux's `combineReducers`, or any
of the other methods available.

In the same way, here we are using the vanilla `createStore` from redux,
but we could boost that with middleware in exactly the same way we always
do with redux. `redux-api` is just another component, latching onto the
redux store with a plain old reducer function. Simple!

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
let reducer = app.handle.bind(app);

// store object can be const. We can share it with the world, export it etc
const store = createStore(reducer);
link(store, app);
export default store;

if (module.hot) {
  module.hot.accept('./AppApi', () => {
    // re-create and re-link app object
    AppApi = require('./AppApi').default;
    app = new AppApi();
    reducer = app.handle.bind(app);
    store.replaceReducer(reducer);
    link(store, app);
  });
}
```

Easy isn't it? Our store's state survives! The app will continue exactly where it
left off, but with our new code loaded into it.


## Examples

Check out the `examples` folder for some examples including tests. Invoke

```sh
npm run examples
```

to run them.


## Start hacking
I invite you to hack on the examples a bit. It's probably the easiest way to get
started. Clone / fork this repo, then `cd` into the project root and invoke

```sh
npm install
```

Then, start a webpack development server by invoking

```sh
npm run examples-dev

> redux-apis@0.10.0 examples-dev C:\ws\redux-apis
> webpack-dev-server --context examples --output-file-name examples.js "mocha!./index.jsx" --content-base examples --port 8889

http://localhost:8889/webpack-dev-server/
webpack result is served from /
content is served from C:\ws\redux-apis\examples
Hash: 787073c1aebbf09f2440
Version: webpack 1.12.11
Time: 8784ms
            Asset    Size  Chunks             Chunk Names
    redux-apis.js  570 kB       0  [emitted]  main
redux-apis.js.map  693 kB       0  [emitted]  main
webpack: bundle is now VALID.
```
<sup><sub>(Don't worry about those file sizes, that is due to the debug
/ hot reloading code. `redux-apis.min.js` weighs in at just 1.526 bytes
minified and gzipped)</sub></sup>

Point your browser to http://localhost:8889/webpack-dev-server/ and you
should see the mocha test suite, with all tests passing.

Now open the source files in the `examples` folder in your favourite
text editor. Make some changes and save. You should see the page hot-reload.
Start hacking away!


## Feedback, suggestions, questions, bugs
Please visit the [issue tracker](https://github.com/Download/redux-apis/issues)
for any of the above. Don't be afraid about being off-topc.
Constructive feedback most appreciated!


## Credits
My thanks to [David Lents](https://github.com/dlents) for his constructive
criticism that lead me to rethink the API and resulted in a much cleaner,
better thought out approach.


## Copyright
© 2016, [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.


## License
[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)
