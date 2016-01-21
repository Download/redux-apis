import 'source-map-support/register';
import { expect } from 'chai';
import { createStore } from 'redux';
import { Api, link } from './redux-apis';

describe('Api', () => {
	it('is a class that serves as a base class for redux-aware API\'s', () => {
		expect(Api).to.not.equal(undefined);
		expect(Api).to.be.a('function');
		class MyApi extends Api {};
		expect(MyApi.prototype).to.be.an.instanceOf(Api);
	});

	it('has only hidden properties', () => {
		console.log(Object.keys(new Api()));
		expect(Object.keys(new Api()).length).to.equal(0);
	});



	describe('.constructor(state)', () => {
		it('can be called without arguments', () => {
			const myApi = new Api();
			expect(myApi).to.be.an.instanceOf(Api);
			expect(myApi).to.have.a.property('getState');
			expect(myApi.getState).to.be.a('function');
		});

		it('results in `getState` returning `undefined`', () => {
			const myApi = new Api()
			expect(myApi.getState()).to.equal(undefined);
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

	describe('.initialState()', () => {
		it('is a function available on instances of Api', () => {
			expect(new Api().initialState).to.be.a('function');
		});

		it('returns a new empty object by default', () => {
			expect(new Api().initialState()).to.be.an('object');
			expect(Object.keys(new Api().initialState()).length).to.equal(0);
		});

		it('can be overridden to provide custom initial state', () => {
			class MyApi extends Api { initialState(){return {custom:'state'};} }
			expect(new MyApi().initialState()).to.have.a.property('custom');
			expect(new MyApi().initialState().custom).to.equal('state');
		});
	});

	describe('.init()', () => {
		let dispatched = false;
		let initialStateCalled = 0;
		class MyApi extends Api {
			initialState() {initialStateCalled++; return {my: 'state'};}
			dispatch(action) {
				expect(action.type).to.equal('@@redux/INIT');
				dispatched = true;
				super.dispatch(action);
			}
		};
		it('is a function available on instances of Api', () => {
			const myApi = new MyApi();
			expect(myApi.init).to.be.a('function');
		});

		it('dispatches an INIT action to this state tree', () => {
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
		it('results in `initialState` being called', () => {
			expect(initialStateCalled).to.equal(2);
			const myApi = new MyApi().init();
			expect(initialStateCalled).to.equal(3);
		});
		it('results in `getState` returning the initial state', () => {
			const myApi = new MyApi().init();
			expect(myApi).to.have.a.property('getState');
			expect(myApi.getState).to.be.a('function');
			expect(myApi.getState()).to.have.a.property('my');
			expect(myApi.getState().my).to.equal('state');
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

	describe('.handle(state, action)', () => {
		it('is a function available on instances of Api', () => {
			class MyApi extends Api {};
			const myApi = new MyApi();
			expect(myApi.handle).to.be.a('function');
		});

		it('is called for each action that is dispatched to this api tree', () => {
			let called = false;
			class MyApi extends Api {
				handle(state, action) {
					expect(action).to.not.equal(undefined);
					expect(action).to.have.a.property('type');
					expect(action.type).to.equal('TEST');
					called = true;
					super.handle(state, action);
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
			expect(myApi.getState()).to.equal(undefined);
			myApi.call('Some message');
			expect(handlerCalled).to.equal(true);
			expect(myApi.getState()).to.not.equal(undefined);
			expect(myApi.getState()).to.have.a.property('msg');
			expect(myApi.getState().msg).to.equal('Some message');
		})

		it('invokes `initialState` if no handler exists and current state is undefined', () => {
			class MyApi extends Api {
				initialState() {
					return { msg: 'Hello, World!' };
				}
			};
			let myApi = new MyApi();
			expect(myApi.getState()).to.equal(undefined);
			myApi.dispatch(myApi.createAction('SOME_ACTION')({ some: 'payload' }));
			expect(myApi.getState()).to.not.equal(undefined);
			expect(myApi.getState()).to.have.a.property('msg');
			expect(myApi.getState().msg).to.equal('Hello, World!');
		})

		it('does not invoke `initialState` if current state is already defined', () => {
			let initialStateCalled = 0;
			class MyApi extends Api {
				initialState() {
					initialStateCalled++;
					return { msg: 'Hello, World!' };
				}
			};
			let myApi = new MyApi();
			expect(initialStateCalled).to.equal(0);
			myApi.dispatch(myApi.createAction('SOME_ACTION')({ some: 'payload' }));
			expect(initialStateCalled).to.equal(1);
			myApi.dispatch(myApi.createAction('SOME_ACTION')({ some: 'payload' }));
			expect(initialStateCalled).to.equal(1);
		})
	});
});


describe('link(parent, child, link/*(parentState,childState)*/ )', () => {
	it('can be used to link sub Apis', () => {
		class SubApi extends Api {};
		class MyApi extends Api {
			constructor(state) {
				super(state);
				this.nested = link(this, new SubApi());
				expect(this.nested).to.be.an.instanceOf(SubApi);
			}
		};
		const myApi = new MyApi({nested: 'test'});
		expect(myApi).to.have.a.property('nested');
		expect(myApi.nested.getState()).to.equal('test');
	});
	it('accepts an optional function to link to the parent state', () => {
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
});

