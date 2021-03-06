﻿import Api, { link } from '../src/redux-apis';
import DrawerApi from './DrawerApi';
import { expect } from 'chai';

describe('DrawerApi', () => {
	it('is a subclass of Api', () => {
		expect(DrawerApi.prototype).to.be.an.instanceOf(Api);
	});

	it('returns an instance when invoked with new', () => {
		expect(new DrawerApi()).to.be.an.instanceOf(DrawerApi);
	});

	it('accepts a state slice', () => {
		let drawer = new DrawerApi({open:true});
		expect(drawer).to.be.an.instanceOf(DrawerApi);
		expect(drawer.getState()).to.have.a.property('open');
		expect(drawer.getState().open).to.equal(true);
	});

	it('has properties to inspect it\'s state slice', () => {
		let drawer = new DrawerApi();
		expect(drawer).to.have.property('open');
		expect(drawer.open).to.equal(false);
	});

	it('has methods to dispatch actions to manipulate it\'s state slice', () => {
		let drawer = new DrawerApi();
		expect(drawer).to.have.property('openDrawer');
		expect(drawer.openDrawer).to.be.a('function');
		expect(drawer).to.have.property('closeDrawer');
		expect(drawer.closeDrawer).to.be.a('function');
	});

	describe('.open', () => {
		it('returns the value of the property `open` in the state slice', () => {
			let drawer = new DrawerApi({open:true});
			expect(drawer.open).to.equal(true);
			expect(drawer.open).to.equal(drawer.getState().open);
			drawer = new DrawerApi();
			expect(drawer.open).to.equal(false);
			expect(drawer.open).to.equal(drawer.getState().open);
		});
	});

	describe('.openDrawer()', () => {
		class TestOpen extends Api {
			constructor(state) {
				super(state);
				this.drawer = link(this, new DrawerApi());
			}

			dispatch(action) {
				expect(action).to.be.an('object');
				expect(action).to.have.a.property('type');
				expect(action.type).to.be.a('string');
				expect(action.type).to.contain('/');
				let idx = action.type.indexOf('/');
				let apiPath = action.type.substring(0, idx);
				let apiAction = action.type.substring(idx + 1);
				expect(apiPath).to.equal('drawer');
				expect(apiAction).to.equal('OPEN');
				return super.dispatch(action);
			}

			createAction(actionType, payloadCreator, metaCreator) {
				expect(actionType).to.be.a('string');
				expect(actionType).to.equal('drawer/OPEN');
				return super.createAction(actionType, payloadCreator, metaCreator);
			}
		}

		it('creates an action \'OPEN\' and dispatches it to the parent api', () => {
			const test = new TestOpen({drawer: {open:false}});
			expect(test.drawer.getState().open).to.equal(false);
			test.drawer.openDrawer();
		});

		it('results in the `open` property being set to `true`', () => {
			const test = new TestOpen({drawer: {open:false}});
			test.drawer.openDrawer();
			expect(test.drawer.open).to.equal(true);
		});
	});

	describe('.closeDrawer()', () => {
		class TestClose extends Api {
			constructor(state={}) {
				super(state);
				this.drawer = link(this, new DrawerApi());
			}

			dispatch(action) {
				expect(action).to.be.an('object');
				expect(action).to.have.a.property('type');
				expect(action.type).to.be.a('string');
				expect(action.type).to.contain('/');
				let idx = action.type.indexOf('/');
				let apiPath = action.type.substring(0, idx);
				let apiAction = action.type.substring(idx + 1);
				expect(apiPath).to.equal('drawer');
				expect(apiAction).to.equal('CLOSE');
				return super.dispatch(action);
			}

			createAction(actionType, payloadCreator, metaCreator) {
				expect(actionType).to.be.a('string');
				expect(actionType).to.equal('drawer/CLOSE');
				return super.createAction(actionType, payloadCreator, metaCreator);
			}
		}

		it('creates an action \'CLOSE\' and dispatches it to the parent api', () => {
			let test = new TestClose({drawer: {open:true}});
			expect(test.drawer.open).to.equal(true);
			test.drawer.closeDrawer();
		});

		it('results in the `open` property being set to `false`', () => {
			let test = new TestClose({drawer: {open:true}});
			test.drawer.closeDrawer();
			expect(test.drawer.open).to.equal(false);
		});
	});
});