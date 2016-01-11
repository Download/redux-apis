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
				myApi.dispatch(myApi.createAction('TEST'));
				expect(called).to.equal(true);
			});
		});

		describe('createAction', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi.createAction).to.be.a('function');
			});

			it('creates an action based on the given action type and optional payload', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				let action = myApi.createAction('TEST');
				expect(action).to.not.equal(undefined);
				expect(action).to.have.a.property('type');
				expect(action.type).to.equal('TEST');
				expect(action.payload).to.equal(undefined);
				const payload = {some: {pay:'load'}};
				action = myApi.createAction('TEST_WITH_PAYLOAD', payload);
				expect(action.type).to.equal('TEST_WITH_PAYLOAD');
				expect(action.payload).to.equal(payload);
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

		describe('execute', () => {
			it('is a function available on instances of Api', () => {
				class MyApi extends Api {};
				const myApi = new MyApi();
				expect(myApi.execute).to.be.a('function');
			});
		});
	});

	describe('RootApi', () => {
		it('is a class that binds a Redux store to an Api', () => {
			expect(RootApi).to.not.equal(null);
			expect(RootApi).to.be.a('function');
		});

		describe('constructor', () => {
			it('creates a new, unbound root api object', () => {
				let root = new RootApi();
				expect(root).to.not.equal(null);
				expect(root).to.be.an.instanceOf(RootApi);
			});
		});

		describe('reducer', () => {
			it('is a root reducer function that can be used to create a Redux store', () => {
				let root = new RootApi();
				expect(root).to.have.a.property('reducer');
				expect(root.reducer).to.be.a('function');
				let store = createStore(root.reducer);
				expect(store).to.not.equal(null);
				expect(store).to.have.a.property('getState');
				expect(store.getState).to.be.a('function');
			});
		});

		describe('bind', () => {
			it('binds an Api to a Redux store', () => {
				let root = new RootApi();
				expect(root).to.have.a.property('bind');
				expect(root.bind).to.be.a('function');
				let store = createStore(root.reducer);
				class MyApi extends Api {};
				root.bind(MyApi, store);
				expect(root).to.have.a.property('api');
				expect(root.api).to.be.an.instanceOf(MyApi);
				expect(root.api).to.have.a.property('parent');
				expect(root.api.parent).to.equal(root);
				expect(root).to.have.a.property('store');
				expect(root.store).to.equal(store);
				expect(root.api).to.have.a.property('state');
				var state = root.api.state;
				var storeState = store.getState();
				expect(state).to.equal(storeState);
			});
		});
	});
});
