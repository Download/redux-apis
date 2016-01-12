import Api from '../src/redux-apis';

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