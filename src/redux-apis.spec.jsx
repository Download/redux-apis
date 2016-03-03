import { expect } from 'chai';
import log from 'picolog';
import { createStore } from 'redux';
import React, { Component } from 'react';
import { renderToString } from 'react-dom/server';
import { connect, Provider } from 'react-redux';

import { Api, link, apiLink, namedLink } from './redux-apis';

describe('Api', () => {
	it('is a class that serves as a base class for redux-aware API\'s', () => {
		expect(Api).to.not.equal(undefined);
		expect(Api).to.be.a('function');
		class MyApi extends Api {};
		expect(MyApi.prototype).to.be.an.instanceOf(Api);
		expect(Object.keys(new Api()).length).to.equal(0);
	});

	describe('.constructor(state)', () => {
		it('can be called without arguments', () => {
			const myApi = new Api();
			expect(myApi).to.be.an.instanceOf(Api);
			expect(myApi).to.have.a.property('getState');
			expect(myApi.getState).to.be.a('function');
		});

		it('results in `getState` returning the default value for the `state` parameter', () => {
			const myApi = new Api()
			expect(myApi.getState()).to.be.an('object');
		});

		it('accepts a state slice', () => {
			const myApi = new Api({my: 'state'});
			expect(myApi).to.be.an.instanceOf(Api);
		});

		it('results in `getState` returning the given state slice', () => {
			const myApi = new Api({my: 'state'})
			expect(myApi.getState()).to.have.a.property('my');
			expect(myApi.getState().my).to.equal('state');
		});
	});

	describe('.init()', () => {
		let dispatched = false;
		let initialStateCalled = 0;
		class Nested extends Api {constructor(state = 'NESTED') {super(state);}}
		class MyApi extends Api {
			constructor(state = {my: 'state'}) {
				super(state);
				this.nested = link(this, new Nested());
			}
			dispatch(action) {
				expect(action.type).to.equal('@@redux/INIT');
				dispatched = true;
				return super.dispatch(action);
			}
		};

		it('can be used to manually initialize the state tree', () => {
			const myApi = new MyApi();
			expect(myApi.init).to.be.a('function');
		});

		it('dispatches a redux INIT action to this state tree', () => {
			const myApi = new MyApi();
			expect(dispatched).to.equal(false);
			myApi.init();
			expect(dispatched).to.equal(true);
		});
		it('returns `this` to allow for chaining', () => {
			const myApi = new MyApi();
			const returned = myApi.init();
			expect(returned).to.equal(myApi);
		});
		it('results in `getState` returning the initial state', () => {
			const myApi = new MyApi().init();
			expect(myApi).to.have.a.property('getState');
			expect(myApi.getState).to.be.a('function');
			expect(myApi.getState()).to.have.a.property('my');
			expect(myApi.getState().my).to.equal('state');
			expect(myApi.getState()).to.have.a.property('nested');
			expect(myApi.getState().nested).to.equal('NESTED');
		});
		it('does not have to be called when using redux', () => {
			const myApi = new MyApi();
			const store = createStore(myApi.reducer);
			link(store, myApi);
			expect(myApi).to.have.a.property('getState');
			expect(myApi.getState).to.be.a('function');
			expect(myApi.getState()).to.have.a.property('my');
			expect(myApi.getState().my).to.equal('state');
			expect(myApi.getState()).to.have.a.property('nested');
			expect(myApi.getState().nested).to.equal('NESTED');
		});
	});

	describe('.getState()', () => {
		class MyApi extends Api {
			constructor(state = {initial:'state'}){
				super(state);
			}
		}

		it('is a function available on instances of Api', () => {
			const myApi = new MyApi();
			expect(myApi.getState).to.be.a('function');
		});

		it('returns the current state for the Api object', () => {
			const api1 = new MyApi();
			const state1 = api1.getState();
			expect(state1).to.be.an('object');
			expect(state1).to.have.a.property('initial');
			expect(state1.initial).to.equal('state');
			const api2 = new MyApi({initial:'custom'});
			const state2 = api2.getState();
			expect(state2.initial).to.equal('custom');
		});
	});

	describe('.getParent()', () => {
		class MyApi extends Api {}

		it('is a function available on instances of Api', () => {
			const myApi = new MyApi();
			expect(myApi.getParent).to.be.a('function');
		});

		it('returns the parent of the Api object', () => {
			class Root extends Api {
				constructor(state) {
					super(state);
					this.sub = link(this, new MyApi());
				}
			}
			const root = new Root().init();
			expect(root).to.have.a.property('getParent');
			expect(root.getParent).to.be.a('function');
			expect(root.sub).to.be.an('object');
			expect(root.sub).to.have.a.property('getParent');
			expect(root.sub.getParent).to.be.a('function');
			expect(root.getParent()).to.equal(undefined);
			expect(root.sub.getParent()).to.equal(root);
		});
	});

	describe('.setHandler(actionType, handler/*(state,action)*/ )', () => {
		it('is a function available on instances of Api', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.setHandler).to.be.a('function');
		});
		it('accepts an action type and a handler function', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			myApi.setHandler('TEST', function(){});
			expect(myApi.__actionHandlers['TEST']).to.be.a('function');
		});
		it('results in the handler being called when an action of the given type is dispatched', () => {
			let called = false;
			class MyApi extends Api {};
			const myApi = new MyApi();
			myApi.setHandler('TEST', function(){called = true;});
			myApi.dispatch(myApi.createAction('TEST')());
			expect(called).to.equal(true);
		});
		it('results in the handler being passed the current state and action when called', () => {
			let called = false;
			class MyApi extends Api {};
			const myApi = new MyApi({my:'state'});
			myApi.setHandler('TEST', function(state, action){
				expect(state).to.be.an('object');
				expect(state).to.have.a.property('my');
				expect(state.my).to.equal('state');
				expect(action).to.be.an('object');
				expect(action).to.have.a.property('type');
				expect(action.type).to.equal('TEST');
				called = true;
			});
			myApi.dispatch(myApi.createAction('TEST')());
			expect(called).to.equal(true);
		});
	});

	describe('.getHandler(actionType)', () => {
		it('is a function available on instances of Api', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.getHandler).to.be.a('function');
		});
		it('accepts an action type and returns any handler set for that action type', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			myApi.setHandler('TEST', function(){});
			expect(myApi.__actionHandlers['TEST']).to.be.a('function');
		});
		it('returns `undefined` when no handler was set for the given action type', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.getHandler('TEST')).to.equal(undefined);
		});
	});

	describe('.clearHandler(actionType)', () => {
		class MyApi extends Api {};
		const myApi = new MyApi();
		myApi.setHandler('TEST', function(){});

		it('is a function available on instances of Api', () => {
			expect(myApi.clearHandler).to.be.a('function');
		});
		it('accepts an action type', () => {
			myApi.clearHandler('TEST');
		});

		it('results in no handler to be registered anymore for the given action type', () => {
			expect(myApi.__actionHandlers['TEST']).to.equal(undefined);
		});
	});

	describe('.createAction(actionType, payloadCreator, metaCreator', () => {
		class MyApi extends Api {};
		class MyComplexApi extends Api {
			constructor(...args) {
				super(...args);
				this.nested = link(this, new MyApi());
			}
		}
		const myApi = new MyApi();
		const myComplexApi = new MyComplexApi();

		it('is a function available on instances of Api', () => {
			expect(myApi.createAction).to.be.a('function');
			expect(myComplexApi.createAction).to.be.a('function');
		});

		it('creates a function that will create actions of the given action type', () => {
			let test = myApi.createAction('TEST');
			expect(test).to.not.equal(undefined);
			expect(test).to.be.a('function');
			let action = test({my: 'action'});
			expect(action).to.be.an('object');
			expect(action).to.have.a.property('type');
			expect(action.type).to.equal('TEST');
			expect(action).to.have.a.property('payload');
			expect(action.payload).to.be.an('object');
			expect(action.payload).to.have.a.property('my');
			expect(action.payload.my).to.equal('action');
		});

		it('applies namespaces to the action type based on the Api hierarchy', () => {
			let test = myComplexApi.nested.createAction('TEST');
			let action = test({my: 'action'});
			expect(action.type).to.equal('nested/TEST');
		});

		it('accepts optional actionCreator and metaCreator functions', () => {
			let actionCreatorCalled = false;
			function actionCreator(...args) {actionCreatorCalled = true;}
			let metaCreatorCalled = false;
			function metaCreator(...args) {metaCreatorCalled = true;}
			let test = myApi.createAction('TEST', actionCreator, metaCreator);
			let action = test({my: 'action'});
			expect(actionCreatorCalled).to.equal(true);
			expect(metaCreatorCalled).to.equal(true);
		});
	});

	describe('.dispatch(action)', () => {
		it('is a function available on instances of Api', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.dispatch).to.be.a('function');
		});

		it('dispatches an action to the root of the Api tree', () => {
		});
	});

	describe('.reducer(state, action)', () => {
		it('is a function available on instances of Api', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.reducer).to.be.a('function');
		});

		it('is auto-bound to it\'s Api instance', () => {
			let boundInstance = null;
			class MyApi extends Api {
				reducer(...args) {
					boundInstance = this;
					super.reducer(...args);
				}
			}
			const myApi = new MyApi();
			const myApi2 = new MyApi();
			myApi.reducer.bind(myApi2)(undefined, {type:'SOME_ACTION'});
			expect(boundInstance).to.be.an('object');
			expect(boundInstance).to.be.an.instanceof(Api);
			expect(boundInstance).to.equal(myApi);
		});

		it('is called for each action that is dispatched to this api tree', () => {
			let called = false;
			class MyApi extends Api {
				reducer(state, action) {
					expect(action).to.not.equal(undefined);
					expect(action).to.have.a.property('type');
					expect(action.type).to.equal('TEST');
					called = true;
					super.reducer(state, action);
				}
			};
			const myApi = new MyApi();
			expect(called).to.equal(false);
			myApi.dispatch(myApi.createAction('TEST')());
			expect(called).to.equal(true);
		});

		it('looks for an action handler for the action and invokes it if found', () => {
			let handlerCalled = false;
			class MyApi extends Api {
				constructor(state) {
					super(state);
					this.setHandler('CALL', (state, action) => {
						handlerCalled = true;
						return { ...state, msg:action.payload };
					});
				}
				call(msg) {
					this.dispatch(this.createAction('CALL')(msg));
				}
			};
			let myApi = new MyApi();
			myApi.call('Some message');
			expect(handlerCalled).to.equal(true);
			expect(myApi.getState()).to.have.a.property('msg');
			expect(myApi.getState().msg).to.equal('Some message');
		})
	});

	describe('.connector(state, ownProps)', () => {
		it('is a function available on instances of Api', () => {
			const myApi = new Api();
			expect(myApi.connector).to.be.a('function');
		});

		it('is auto-bound to it\'s Api instance', () => {
			const myApi = new Api({state:'OK'});
			const myApi2 = new Api({state:'WRONG'});
			const test = myApi.connector.bind(myApi2)();
			expect(test).to.be.an('object');
			expect(test).to.have.a.property('state');
			expect(test.state).to.equal('OK');
		});

		it('returns an object with this Api\'s state, `ownProps` and this Api\'s enumerable properties spread into it, and an `api` property referencing this Api', () => {
			const myApi = new Api({state:'OK'});
			myApi.enumerable = 'prop';
			const connect = myApi.connector;
			const test = connect({},{own:'prop'});
			expect(test).to.be.an('object');
			expect(test).to.have.a.property('state');
			expect(test.state).to.equal('OK');
			expect(test).to.have.a.property('own');
			expect(test.own).to.equal('prop');
			expect(test).to.have.a.property('enumerable');
			expect(test.enumerable).to.equal('prop');
			expect(test).to.have.a.property('api');
			expect(test.api).to.equal(myApi);
		});

		it('returns an object with sub-objects for nested Apis, that change identity when the nested Api\'s state changes.', () => {
			class SubApi extends Api {
				constructor(state = {value:''}) {
					super(state);
					this.setHandler('SET', (state,{payload}) => ({...state, value:payload}));
					Object.defineProperty(this, 'value', {enumerable:true, get:()=>this.getState().value});
				}
				set(value) {
					return this.dispatch(this.createAction('SET')(value));
				}
			}
			class ApiWithSubs extends Api {
				constructor(state) {
					super(state);
					this.sub = link(this, new SubApi());
				}
			}
			const myApi = new ApiWithSubs().init();
			const prev = myApi.connector();
			let curr = myApi.connector();
			expect(curr).to.equal(prev);
			expect(curr.sub).to.equal(prev.sub);
			myApi.sub.set('test');
			curr = myApi.connector();
			expect(curr).to.not.equal(prev);
			expect(curr.sub).to.not.equal(prev.sub);
		});

		it('can be used in combination with the @connect decorator from react-redux', () => {
			class MyApi extends Api {
				constructor(state = {message:'Hello, World!'}) {
					super(state);
				}
			}

			const app = new MyApi();

			@connect(app.connector)
			class App extends Component {
			  render() {
				const { message } = this.props;
				return (
					<p>{message}</p>
				);
			  }
			}

			const store = createStore(app.reducer);
			link(store, app);

			let markup = renderToString(<Provider store={store}><App /></Provider>);
			log.info(markup);
			expect(markup).to.contain('Hello, World!');
		});
	});
});

describe('link(parent, child, link/*(parentState,childState)*/ )', () => {
	it('can be used to link a child api to a parent api', () => {
		class SubApi extends Api {};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.nested = link(this, new SubApi());
			}
		};
		const myApi = new MyApi({nested: 'test'});
		expect(myApi).to.have.a.property('nested');
		expect(myApi.nested.getState()).to.equal('test');
	});
	it('results in actions on the child api to be dispatched via the parent api', () => {
		let dispatchCalled = false;
		class SubApi extends Api {test(){this.dispatch(this.createAction('TEST')());}};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.nested = link(this, new SubApi());
				expect(this.nested).to.be.an.instanceOf(SubApi);
			}
			dispatch(action) {
				if (action.type.indexOf('TEST') !== -1) {dispatchCalled = true;}
				return super.dispatch(action);
			}
		};
		const myApi = new MyApi({nested: 'test'});
		myApi.nested.test();
		expect(dispatchCalled).to.equal(true);
	});
	it('accepts an optional `link` function to link the child state to the parent state', () => {
		class SubApi extends Api {};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.nested = link(this, new SubApi(), (state, subState) => subState ? state.custom = subState : state.custom);
			}
		};
		const expected = 'wow a custom state link!';
		const myApi = new MyApi({custom: expected});
		expect(myApi).to.have.a.property('nested');
		expect(myApi.nested).to.be.an.instanceOf(SubApi);
		expect(myApi.nested.getState()).to.equal(expected);
	});
	it('can be used to link an api to a redux store', () => {
		class SubApi extends Api {constructor(state = {sub:'api'}){super(state);}};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.reducerCalled = 0;
				this.nested = link(this, new SubApi());
				this.setHandler('TEST', (state, action) => {
					return { ...state, test:action.payload };
				})
			}
			test(msg) {
				return this.dispatch(this.createAction('TEST')(msg));
			}
			reducer(state, action) {
				this.reducerCalled++;
				return super.reducer(state, action);
			}
		};
		let myApi = new MyApi();
		expect(myApi.reducerCalled).to.equal(0);
		let store = createStore(myApi.reducer, {custom:'state'});
		link(store, myApi);
		expect(store).to.be.an('object');
		expect(store.getState()).to.have.a.property('nested');
		expect(store.getState().nested).to.have.a.property('sub');
		expect(store.getState().nested.sub).to.equal('api');
		expect(myApi.reducerCalled).to.equal(1);
		myApi.test('MESSAGE');
		expect(myApi.reducerCalled).to.equal(2);
		expect(store.getState()).to.have.a.property('test');
		expect(store.getState().test).to.equal('MESSAGE');
		expect(store.getState().test).to.equal(myApi.getState().test);

		myApi = new MyApi();
		expect(myApi.reducerCalled).to.equal(0);
		store = createStore(myApi.reducer, {nested: 'test'});
		link(store, myApi);
		expect(store.getState()).to.have.a.property('nested');
		expect(store.getState().nested).to.equal('test');
		expect(myApi.nested.getState()).to.equal('test');
		myApi.test('MESSAGE');
		expect(myApi.reducerCalled).to.equal(2);
		expect(store.getState()).to.have.a.property('test');
		expect(store.getState().test).to.equal('MESSAGE');
		expect(store.getState().test).to.equal(myApi.getState().test);
	});
	it('can be used to index state objects into a parent array', () => {
		const indexLink = (idx) => (parentState, childState) => childState
				? parentState[idx] = childState
				: parentState[idx];

		class MyApi extends Api {
			constructor(state = []) {
				super(state);
				this.first = link(this, new Api('1st'), indexLink(0));
				this.second = link(this, new Api('2nd'), indexLink(1));
				this.third = link(this, new Api('3rd'), indexLink(2));
			}
			init() {this.dispatch(this.createAction('@@redux/INIT')()); return this;}
		}
		const myApi = new MyApi().init();
		expect(myApi.getState()).to.be.an.instanceOf(Array);
		expect(myApi.getState()[0]).to.equal('1st');
		expect(myApi.getState()[1]).to.equal('2nd');
		expect(myApi.getState()[2]).to.equal('3rd');
	});
});

describe('apiLink(parentState, childState)', () => {
	it('is used as the default link from a child api to a parent api', () => {
		class SubApi extends Api {};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.nested = link(this, new SubApi());
			}
		};
		const myApi = new MyApi({nested: 'test'});
		expect(myApi).to.have.a.property('nested');
		expect(myApi.nested).to.have.a.property('__link');
		expect(myApi.nested.__link).to.be.a('function');
		expect(myApi.nested.getState()).to.equal('test');
	});
});

describe('namedLink(name)', () => {
	it('it can be used to create a linker function to pass to `link`', () => {
		const customLink = namedLink('custom');
		expect(customLink).to.be.a('function');
	});

	it('it returns a function that gets the state slice with the given name', () => {
		const customLink = namedLink('custom');
		const test = customLink({custom:'test'});
		expect(test).to.equal('test');
	});

	it('it can be used to customize the state link between a parent and child api', () => {
		const customLink = namedLink('custom');
		class SubApi extends Api {};
		class MyApi extends Api {
			constructor(state = {custom:'test'}) {
				super(state);
				this.nested = link(this, new SubApi(), customLink);
			}
		};
		const myApi = new MyApi();
		expect(myApi.nested.getState()).to.equal('test');
	});
});
