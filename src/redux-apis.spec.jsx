import { expect } from 'chai';
import log from 'picolog';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import React, { Component } from 'react';
import { renderToString } from 'react-dom/server';
import { match, Route, RouterContext, createMemoryHistory } from 'react-router';
import { connect, Provider } from 'react-redux';
import { Api, link, onload, load, Async } from './redux-apis';

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
			store.app = link(store, app);

			let markup = renderToString(<Provider store={store}><App /></Provider>);
			log.info(markup);
			expect(markup).to.contain('Hello, World!');
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
	it('ignores the optional `link` parameter when the parent is a redux store', () => {
		const expected = 'wow a custom state link!';
		const myApi = new Api({custom: expected});
		let store = createStore(myApi.reducer);
		link(store, myApi, (state, subState) => subState ? state.custom = subState : state.custom);
		expect(myApi.getState()).to.have.a.property('custom');
		expect(myApi.getState().custom).to.equal(expected);
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

describe('@onload(fn/*(params)*/ )', () => {
	it('can be used to decorate a component with a function to be called on load', () => {
		@onload(() => {})
		class MyComponent{}
		expect(MyComponent).to.have.a.property('onload');
		expect(MyComponent.onload).to.be.a('function');
	});
	it('can be used to decorate a component wrapped by `@connect` from react-redux', () => {
		@onload(() => {})
		@connect(() => {})
		class OnLoadFirst{}
		expect(OnLoadFirst).to.have.a.property('onload');
		expect(OnLoadFirst.onload).to.be.a('function');

		@connect(() => {})
		@onload(() => {})
		class OnLoadLast{}
		expect(OnLoadLast).to.have.a.property('onload');
		expect(OnLoadLast.onload).to.be.a('function');
	});
});


describe('load(components, params)', () => {
	it('can be used to call the load functions on the given components', () => {
		let componentALoaded = false;
		@onload(() => {componentALoaded = true;})
		class ComponentA {}
		load([ComponentA]);
		expect(componentALoaded).to.equal(true);
	});
	it('captures promises and returns a promise that fulfills once loading is complete', () => {
		let componentALoaded = false;
		@onload(() => {componentALoaded = true;})
		class ComponentA {}

		let componentBLoading = false;
		let componentBLoaded = false;
		@onload(() => {
			componentBLoading = true;
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					componentBLoading = false;
					componentBLoaded = true;
					resolve();
				}, 0);
			});
		})
		class ComponentB {}
		let promise = load([ComponentA, ComponentB]);
		expect(componentALoaded).to.equal(true);
		expect(componentBLoaded).to.equal(false);
		expect(componentBLoading).to.equal(true);
		promise.then(() => {
			expect(componentBLoading).to.equal(false);
			expect(componentBLoaded).to.equal(true);
		});
	});
	it('can be used for server-side rendering with react', () => {
		class MyApi extends Api {
			constructor(state = {async:'PENDING', results:[]}) {
				super(state);
				this.setHandler('PENDING', (state, action) => ({...state, async:'PENDING'}));
				this.setHandler('BUSY', (state, action) => ({...state, async:'BUSY'}));
				this.setHandler('DONE', (state, action) => ({...state, async:'DONE'}));
				this.setHandler('SET_RESULTS', (state, action) => ({...state, results:action.payload}));
				this.run = this.run.bind(this);
			}

			pending() {return this.getState().async === 'PENDING';}
			busy() {return this.getState().async === 'BUSY';}
			done() {return this.getState().async === 'DONE';}
			results() {return this.getState().results;}

			setPending() {return this.dispatch(this.createAction('PENDING')());}
			setBusy() {return this.dispatch(this.createAction('BUSY')());}
			setDone() {return this.dispatch(this.createAction('DONE')());}
			setResults(results) {return this.dispatch(this.createAction('SET_RESULTS')(results));}

			run() {return this.dispatch(() => {
				expect(this.pending()).to.equal(true);
				expect(this.busy()).to.equal(false);
				expect(this.done()).to.equal(false);
				this.setBusy();
				expect(this.pending()).to.equal(false);
				expect(this.busy()).to.equal(true);
				expect(this.done()).to.equal(false);
				return Promise.resolve(['Many', 'cool', 'products']).then((results) => {
					this.setDone();
					expect(this.pending()).to.equal(false);
					expect(this.busy()).to.equal(false);
					expect(this.done()).to.equal(true);
					this.setResults(results);
				});
			});}
		}

		const app = new MyApi();

		@onload(app.run)
		@connect(app.connector)
		class App extends Component {
		  render() {
			// 2. access data as props
			const { async, results, api } = this.props;
			return (
				<div>
					<p>{
						async === 'PENDING' ? 'Pending...' : (
						async === 'BUSY' ? 'Busy...' : results)
					}</p>
				</div>
			);
		  }
		}

		const routes = (<Route path="/" component={App}/>);
		const history = createMemoryHistory();
		const store = applyMiddleware(thunk)(createStore)(app.reducer);
		store.app = link(store, app);

		match({ routes, location: '/' }, (err, redirect, renderProps) => {
			let markup = renderToString(<Provider store={store}><RouterContext {...renderProps} /></Provider>);
			log.info('Before loading: ', markup);
			expect(markup).to.contain('Pending...');

			let loaded = load(renderProps.components, renderProps.params);
			markup = renderToString(<Provider store={store}><RouterContext {...renderProps} /></Provider>);
			log.info('During loading: ', markup);
			expect(markup).to.contain('Busy...');

			loaded.then(() => {
				markup = renderToString(<Provider store={store}><RouterContext {...renderProps} /></Provider>);
				log.info('After loading: ', markup);
				expect(markup).to.contain('Many');
				expect(markup).to.contain('cool');
				expect(markup).to.contain('products');
			});
		});
	});
});

