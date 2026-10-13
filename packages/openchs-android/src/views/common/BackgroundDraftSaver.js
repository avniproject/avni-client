import {AppState} from 'react-native';
import FormResume from '../../service/draft/FormResume';
import General from '../../utility/General';

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
        // Android can close the screen while keeping the app running (low memory, a theme change while locked);
        // that unmounts the form too, and the note is what reopens it.
        if (AppState.currentState === 'active') FormResume.forget();
    }

    onAppStateChange(nextAppState) {
        if (nextAppState === 'background') {
            try {
                this.view.dispatchAction(this.actionName, {
                    onDraftSaved: (draftUUID, pageNumber) => FormResume.remember(this.resumeType, draftUUID, pageNumber)
                });
            } catch (e) {
                General.logError('BackgroundDraftSaver', e);
            }
        } else if (nextAppState === 'active') {
            FormResume.forget();
        }
    }
}

export default BackgroundDraftSaver;
