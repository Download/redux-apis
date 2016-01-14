# redux-apis <sub><sup>v0.8.0</sup></sub>

**Helpers for creating Redux-aware APIs**

## Installation
```sh
npm install --save redux-apis
```

## Usage

* [Create APIs](#create-apis)
* [Compose existing APIs into new ones](#compose-existing-apis-into-new-ones)
* [Create the root API](#create-the-root-api)
* [Use the root API with Hot Module Replacement](#use-the-root-api-with-hot-module-replacement)

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
`this.state`. Using this we can easily implement getters:

```js
export default class DrawerApi extends Api {
	isOpen() {
		return this.state.open;
	}
}
```

The code above assumes that our state has a boolean flag `open`... But we need to provide
that initial state:

```js
export default class DrawerApi extends Api {
	initialState() {
		return { open: false };
	}

	isOpen() {
		return this.state.open;
	}
}
```

To manipulate the state tree, we provide methods that create and dispatch an action:

```js
export default class DrawerApi extends Api {
	initialState() {
		return { open: false };
	}

	isOpen() {
		return this.state.open;
	}

	open() {
		this.dispatch(this.createAction('OPEN')());
	}
}
```

Note the second pair of braces in the call to `createAction`. This pattern is copied from
[redux-actions](https://github.com/acdlite/redux-actions)... Heck, the code itself is copied
from `redux-actions`! ;) The resulting actions follow the [Flux Standard Actions]
(https://github.com/acdlite/flux-standard-action) format.

We then register *handlers* for these actions in the constructor:

```js
export default class DrawerApi extends Api {
	constructor(state) {
		super(state);

		this.addHandler('OPEN', function handleOpen(action) {
			return { ...this.state, open: true };
		});
	}

	initialState() {
		return { open: false };
	}

	isOpen() {
		return this.state.open;
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
	constructor(state) {
		super(state);
		this.addHandler('OPEN', (action) => ({ ...this.state, open: true }));
		this.addHandler('CLOSE', (action) => ({ ...this.state, open: false }));
	}

	initialState() {
		return { open: false };
	}

	isOpen() {
		return this.state.open;
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

Note how we call `init()` on the new instance. This initializes the state tree based on the
results of `initialState()`. If you use Api objects independently from Redux, you are responsible
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

### Compose existing APIs into new ones
Because each Api has it's own state slice, we can easily use the same Api multiple times:

```js
import Api from 'redux-apis';
import DrawerApi from './DrawerApi';

class AppApi extends Api {
	constructor(state) {
		super(state);
		this.sub('leftDrawer', DrawerApi);
		this.sub('rightDrawer', DrawerApi);
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
`actionType` equal to `'leftDrawer/OPEN'`. `dispatch` than passes that action along to it's parent,
all the way to the top-level. From there, `handle` is invoked and is doing the opposite; it's
breaking the `actionType` apart into separate parts and routing the action to it's destination.
Along the way, 'handle' will be invoked on all nodes of the state tree. If it finds a registered
handler for the action, it invokes that and returns it's result. Otherwise, it returns the current
state, or, if that's not defined, invokes `initialState` and returns that. The side effect of this
is that we can initialize the entire state tree by just sending it an action that it does not handle.
This is exactly what `init()` does; it dispatches an action with type `'@@redux-apis/INIT'`. Redux
does it the same way, dispatching an action with type `'@@redux/INIT'` right after it has created
the store.

Because the `Api` constructor accepts a state argument, we can also initialize it manually:

```js
const leftDrawer = new DrawerApi({open: true});
console.assert(leftDrawer.isOpen() === true, 'The left drawer should be open');
```

### Create the root API

Until now, Redux never came into play. And in fact you don't need it. `redux-apis` has no runtime
dependency on redux and can actually be used without Redux itself! The handlers you registered
are reducers and `Api.handle` acts like a generic reducer routing the incoming actions to the
registered handlers. This is very convenient for testing. But using Redux has many advantages.
There is a lot of `middleware` available for it; small pieces of code that hook into the redux
control flow. Things like [redux-thunk](https://github.com/gaearon/redux-thunk) to allow us to
run code whenever an action is dispatched (for async handling for example) and [redux-logger]
(https://github.com/fcomb/redux-logger) that allows us to log all dispatched actions. Also,
redux gives us a subscription model for listening to store events.

Here's how we hook an API to a redux store:

```js
import Api, { RootApi } from 'redux-apis';
import { createStore } from 'redux';
import AppApi from './AppApi';

const app = new RootApi(AppApi, createStore);
```

We pass `AppApi` as the first argument and `createStore` as the second argument. The
`RootApi` constructor will create an `AppApi` instance and a root reducer function that
just calls the `handle` method on that instance. It then uses this root reducer to
create the Redux store. If you need the store it self you can just grab it from `app.store`.

Here's the cool thing. `app` will be an `instanceof RootApi`, but it will have all methods and
properties of `AppApi`, so it functions as a transparent proxy. Assuming the `AppApi` introduced
above, with properties `leftDrawer` and `rightDrawer`, we will be able to call:

```js
app.rightDrawer.close();
```
and it will just work.

Why would we go through all this trouble with a `RootApi` object acting as a proxy? Why not just
attach the store to the `AppApi` directly? Because of Hot Module Replacement.

### Use the root API with Hot Module Replacement
The Redux store holds all the state of the application, so we don't want to destroy it, as this
is essentially the same as completely reloading our (single page) application. But we want to be
able to replace the Api bound to the store, because that will contain our work-in-progress
application code. This is where the `RootApi` comes in. When we create it, it's constructor calls
`bind` to bind the Api we provided and create proxies for it's methods and properties. But we can
actually call this method directly as well. It will cleanup the proxies for the old Api, and then
bind the new Api in it's place.

Using this information, here is how we can do Hot Module Replacement with `redux-apis`:

```js
import { createStore } from 'redux';
import { RootApi } from 'redux-apis';

// use require i.s.o import
// don't use const as this component will be replaced
let AppApi = require('./AppApi').default;

// app object can be const. We can share it with the world, export it etc
const app = new RootApi(AppApi, createStore);
export default app;

if (module.hot) {
    module.hot.accept('./AppApi', function(){
		app.bind(require('./AppApi').default);
    });
}
```

Easy isn't it? Our store's state survives! The app will continue exactly where it left off,
but with our new code loaded into it.

## Examples

Check out the `examples` folder for some examples including tests. Invoke

```sh
npm run examples
```

to run them.


## Copyright
© 2016, [Stijn de Witt](http://StijnDeWitt.com). Some rights reserved.

## License
[Creative Commons Attribution 4.0 (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/)