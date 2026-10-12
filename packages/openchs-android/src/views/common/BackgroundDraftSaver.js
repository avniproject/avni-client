import {AppState} from 'react-native';
import FormResume from '../../service/draft/FormResume';

class BackgroundDraftSaver {
    constructor(view, actionName, resumeType) {
        this.view = view;
        this.actionName = actionName;
        this.resumeType = resumeType;
    }

    start() {
        this.subscription = AppState.addEventListener('change', (nextAppState) => this.onAppStateChange(nextAppState));
        // Android may restart Avni unseen and resume the form in the background; the note must outlive that.
        if (AppState.currentState === 'active') {
            FormResume.forget();
        } else {
            FormResume.resumedFormOpened();
        }
    }

    stop() {
        this.subscription && this.subscription.remove();
        FormResume.forget();
    }

    onAppStateChange(nextAppState) {
        if (nextAppState === 'background') {
            this.view.dispatchAction(this.actionName, {
                onDraftSaved: (draftUUID, pageNumber) => FormResume.remember(this.resumeType, draftUUID, pageNumber)
            });
        } else if (nextAppState === 'active') {
            FormResume.forget();
        }
    }
}

export default BackgroundDraftSaver;
