import {firebaseEvents, logEvent} from "../../utility/Analytics";
import CustomConfirmDialog from "./CustomConfirmDialog";

export const AvniAlert = (title, message, onYesPress, I18n, skipEvent) => {
    CustomConfirmDialog.show({
        title,
        message,
        yesLabel: I18n.t('yes'),
        noLabel: I18n.t('no'),
        onYes: () => {
            if (!skipEvent) {
                logEvent(firebaseEvents.ABORT_FORM);
            }
            onYesPress();
        }
    });
};

