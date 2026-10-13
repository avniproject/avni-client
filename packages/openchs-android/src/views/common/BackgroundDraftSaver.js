import {AppState} from 'react-native';
import General from '../../utility/General';

class BackgroundDraftSaver {
    constructor(view, actionName) {
        this.view = view;
        this.actionName = actionName;
    }

    start() {
        this.subscription = AppState.addEventListener('change', (nextAppState) => this.onAppStateChange(nextAppState));
    }

    stop() {
        this.subscription && this.subscription.remove();
    }

    onAppStateChange(nextAppState) {
        if (nextAppState !== 'background') return;
        try {
            this.view.dispatchAction(this.actionName, {});
        } catch (e) {
            General.logError('BackgroundDraftSaver', e);
        }
    }
}

export default BackgroundDraftSaver;
