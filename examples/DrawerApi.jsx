import Api from '../src/redux-apis';

export default class DrawerApi extends Api {
	constructor(state = { open: false }) {
		super(state);
		this.setHandler('OPEN', (state, action) => ({ ...state, open: true }));
		this.setHandler('CLOSE', (state, action) => ({ ...state, open: false }));
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