import _ from 'lodash';
import CustomConfirmDialog from "./CustomConfirmDialog";

export const AlertMessage = (title, message, onPress = _.noop) => {
    const displayMessage = typeof message === "string" ? message : JSON.stringify(message);
    CustomConfirmDialog.showAlert({title, message: displayMessage, okLabel: 'OK', onOk: onPress});
};
