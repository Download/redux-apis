import { expect } from 'chai';

import Api, { link } from '../src/redux-apis';
import DrawerApi from './DrawerApi';
import AnotherApi from './AnotherApi';

describe('Two stores', () => {

	describe('AnotherApi', () => {
		it('has a nested DrawerApi', () => {
			let another = new AnotherApi().init(); // must call init on root api
			expect(another.drawer).to.be.an.instanceOf(DrawerApi);
		});

		it('reacts to it\'s own actions', () => {
			let another = new AnotherApi().init();
			expect(another.anotherFired()).to.equal(false);
			another.fireAnother();
			expect(another.anotherFired()).to.equal(true);
		});

		it('can react to actions on it\'s sub api', () => {
			let another = new AnotherApi().init();
			expect(another.drawer.open).to.equal(false);
			expect(another.drawerOpen()).to.equal(false);

			another.drawer.openDrawer();
			expect(another.drawer.open).to.equal(true);
			expect(another.drawerOpen()).to.equal(true);
		});

		it('can dispatch actions to it\'s sub api', () => {
			let another = new AnotherApi().init();
			expect(another.drawer.open).to.equal(false);
			expect(another.drawerOpen()).to.equal(false);

			another.openDrawer();
			expect(another.drawer.open).to.equal(true);
			expect(another.drawerOpen()).to.equal(true);
		});
	});
});