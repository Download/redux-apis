import Api from '../src/redux-apis';

export default class DrawerApi extends Api {
	constructor(state = { open: false }) {
		super(state);
		Object.defineProperty(this, 'open', {enumerable:true, get:()=>this.getState().open});
		this.setHandler('OPEN', (state, action) => ({ ...state, open: true }));
		this.setHandler('CLOSE', (state, action) => ({ ...state, open: false }));
	}

	openDrawer() {
		this.dispatch(this.createAction('OPEN')());
	}

	closeDrawer() {
		this.dispatch(this.createAction('CLOSE')());
	}
}