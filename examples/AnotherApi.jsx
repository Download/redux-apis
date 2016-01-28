import log from 'picolog';

import Api, { link } from '../src/redux-apis';
import DrawerApi from './DrawerApi';

export default class AnotherApi extends Api {
	constructor(state = { drawerOpen: false, anotherFired: false }) {
		super(state);

		// AnotherApi has it's own actions
		this.setHandler('ANOTHER_ACTION', (state, action) => ({...state, anotherFired:true}));

		// But we also want to listen and dispatch actions to a DrawerApi
		this.drawer = link(this, new DrawerApi());

		// Listen for the 'OPEN' action on `drawer`
		this.setHandler('drawer/OPEN', (state, action) => {
			log.log('AnotherApi listened to `OPEN` on `drawer`');
			return {
				...state,
				drawerOpen: true
			};
		});
	}

	anotherFired() {
		return this.getState().anotherFired;
	}

	fireAnother() {
		return this.dispatch(this.createAction('ANOTHER_ACTION')());
	}

	drawerOpen() {
		return this.getState().drawerOpen;
		// or: return this.drawer().isOpen();
	}

	openDrawer() {
		return this.drawer.dispatch(this.drawer.createAction('OPEN')());
		// or: return this.dispatch(this.createAction('drawer/OPEN')());
	}
}