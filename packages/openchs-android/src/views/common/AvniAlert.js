import {firebaseEvents, logEvent} from "../../utility/Analytics";
import CustomConfirmDialog from "./CustomConfirmDialog";

/**
 * `eventContext` is an optional object (e.g. { screen: this.viewName() }) merged into the
 * abort_form event when it fires - previously abort_form carried no context at all, so an
 * abandonment couldn't be attributed to a screen/wizard. Only pass it from a genuine
 * form-abandonment confirmation - skipEvent=true (as before) is for confirms that aren't a
 * form abort at all (e.g. delete/undo dialogs), which should never fire abort_form.
 */
export const AvniAlert = (title, message, onYesPress, I18n, skipEvent, eventContext) => {
    CustomConfirmDialog.show({
        title,
        message,
        yesLabel: I18n.t('yes'),
        noLabel: I18n.t('no'),
        onYes: () => {
            if (!skipEvent) {
                logEvent(firebaseEvents.ABORT_FORM, eventContext);
            }
            onYesPress();
        }
    });
};

