import { expect } from 'chai';
import { createStore } from 'redux';
import Api, { RootApi } from './redux-apis';

describe('redux-apis', () => {
	it('provides helpers to build redux-aware API\'s', () => {});

	describe('Api (default export)', () => {
		it('is a class that serves as a base class for redux-aware API\'s', () => {
			expect(Api).to.not.equal(null);
			expect(Api).to.be.a('function');
			class MyApi extends Api {};
			expect(MyApi.prototype).to.be.an.instanceOf(Api);
		});

		describe('constructor', () => {
			it('can be overidden to add sub Apis', () => {
				class SubApi extends Api {};
				class MyApi extends Api {
					constructor() {
						super();
						this.sub('nested', SubApi);
						expect(this.nested).to.be.an.instanceOf(SubApi);

					}
				};
				const myApi = new MyApi();
				expect(myApi).to.have.a.property('nested');
				expect(myApi.nested).to.be.an.instanceOf(SubApi);
			});
		});

		describe('sub', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi).to.have.a.property('sub');
				expect(myApi.sub).to.be.a('function');
			});

			it('accepts a name and Api class and adds an instance of that class', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				myApi.sub('nested', MyApi);
				expect(myApi).to.have.a.property('nested');
				expect(myApi.nested).to.be.an.instanceOf(MyApi);
			});

			it('sets a property parent on the created instance', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				myApi.sub('nested', MyApi);
				expect(myApi.nested).to.have.a.property('parent');
				expect(myApi.nested.parent).to.equal(myApi);
			});
		});

		describe('addHandler', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi.addHandler).to.be.a('function');
			});

			it('accepts an action type and a handler function', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				myApi.addHandler('TEST', function(){});
				expect(myApi.__handlers['TEST']).to.be.a('function');
			});
		});

		describe('handle', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi.handle).to.be.a('function');
			});

			it('is called for each action that is dispatched to this api tree', () => {
				let called = false;
				class MyApi extends Api {
					handle(action) {
						expect(action).to.not.equal(undefined);
						expect(action).to.have.a.property('type');
						expect(action.type).to.equal('TEST');
						called = true;
						super.handle(action);
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
						this.addHandler('CALL', function(action) {
							handlerCalled = true;
							return { msg:action.payload, ...this.state };
						});
					}
					call(msg) {
						this.dispatch(this.createAction('CALL')(msg));
					}
				};
				let myApi = new MyApi();
				expect(myApi.state).to.equal(undefined);
				myApi.call('Some message');
				expect(handlerCalled).to.equal(true);
				expect(myApi.state).to.not.equal(undefined);
				expect(myApi.state).to.have.a.property('msg');
				expect(myApi.state.msg).to.equal('Some message');
			})

			it('invokes `initialState` if no handler exists and current state is undefined', () => {
				class MyApi extends Api {
					initialState() {
						return { msg: 'Hello, World!' };
					}
				};
				let myApi = new MyApi();
				expect(myApi.state).to.equal(undefined);
				myApi.dispatch(myApi.createAction('SOME_ACTION')({ some: 'payload' }));
				expect(myApi.state).to.not.equal(undefined);
				expect(myApi.state).to.have.a.property('msg');
				expect(myApi.state.msg).to.equal('Hello, World!');
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

		describe('createAction', () => {
			class MyApi extends Api {};
			class MyComplexApi extends Api {
				constructor(...args) {
					super(...args);
					this.sub('nested', MyApi);
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

		describe('dispatch', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi.dispatch).to.be.a('function');
			});

			it('dispatches an action to the root of the Api tree', () => {
			});
		});
	});

	describe('RootApi', () => {
		class MyApi extends Api {someFunction(){}};
		let root = new RootApi(MyApi, createStore);

		it('is a class that binds a Redux store to an Api', () => {
			expect(RootApi).to.not.equal(null);
			expect(RootApi).to.be.a('function');
		});

		describe('constructor', () => {
			it('Accepts an Api and createStore function and creates a root api bound to them', () => {
				expect(root).to.not.equal(null);
				expect(root).to.be.an.instanceOf(RootApi);
			});
		});

		describe('bind', () => {
			it('binds an Api to this RootApi, replacing the previous binding', () => {
				var nestedFunctionCalled = false;
				class MyNestedApi extends Api {
					nestedFunction() {
						nestedFunctionCalled = true;
					}
				}
				var myFunctionCalled = false;
				class MyOtherApi extends Api {
					constructor(...args) {
						super(...args);
						this.sub('nested', MyNestedApi);
					}

					myFunction() {
						myFunctionCalled = true;
					}
				};
				expect(root).to.have.a.property('__api');
				expect(root.__api).to.be.an.instanceOf(MyApi);
				expect(root).to.have.a.property('someFunction');
				expect(root.someFunction).to.be.a('function');
				expect(root).to.have.a.property('bind');
				expect(root.bind).to.be.a('function');
				root.bind(MyOtherApi);
				expect(root).to.have.a.property('__api');
				expect(root.__api).to.be.an.instanceOf(MyOtherApi);
				expect(root.__api).to.have.a.property('parent');
				expect(root.__api.parent).to.equal(root);
				expect(root.__api).to.have.a.property('state');
				expect(root.__api.state).to.equal(root.store.getState());
				expect(root).to.not.have.a.property('someFunction');
				expect(root).to.have.a.property('myFunction');
				expect(root.myFunction).to.be.a('function');
				root.myFunction();
				expect(myFunctionCalled).to.equal(true);
				expect(root).to.have.a.property('nested');
				expect(root.nested).to.be.an.instanceOf(MyNestedApi);
				expect(root.nested).to.have.a.property('nestedFunction');
				expect(root.nested.nestedFunction).to.be.a('function');
				root.nested.nestedFunction();
				expect(nestedFunctionCalled).to.equal(true);
			});
		});
	});
});
