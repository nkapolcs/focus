import { createStore, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import rootReducer from './reducers';
import createStorageSync from './utils/storageSync';
import * as timer from './actions/timer';
import * as websites from './actions/websites';
import * as todos from './actions/todos';

const createAndComposeStore = compose(
	applyMiddleware(thunkMiddleware)
)(createStore);

const store = createAndComposeStore(rootReducer);
const storageSync = createStorageSync(store.getState());

// store.dispatch(websites.addWebsite('read.com'));
chrome.browserAction.setBadgeText({text: '12'}); // need to set the time remaining 
// chrome.browserAction.setIcon({path: icon});
// chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});

// on init, sync state
storageSync(store.getState());
// subscribe to store and sync chrome state
store.subscribe(() => {
	const state = store.getState();
	const statePayload = { type: 'STATE_UPDATE', data: state };

	storageSync(state);
	chrome.runtime.sendMessage(statePayload);
	chrome.tabs.query(
		{currentWindow: true, active : true},
		tab => {
			if (tab.length !== 0) {
				chrome.tabs.sendMessage(tab[0].id, statePayload)
			}
		}
	)
});

chrome.tabs.onActivated.addListener((info) => {
	const state = store.getState();
	const statePayload = { type: 'STATE_UPDATE', data: state };
	const tabId = info.tabId;
	const windowId = info.windowId;
	console.log('here 1');
	chrome.tabs.sendMessage(tabId, statePayload);
});

// TODO: switch this to long-lived connection
// https://developer.chrome.com/extensions/messaging#connect
chrome.extension.onMessage.addListener((req, sender, sendRes) => {
	const actions = {...timer, ...websites, ...todos};
	if (req.type === 'ACTION') {
		console.log('action coming in', req);
		store.dispatch(actions[req.action](...req.data));
	}
	return true;
});