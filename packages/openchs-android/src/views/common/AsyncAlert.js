import CustomConfirmDialog from "./CustomConfirmDialog";

const AsyncAlert = (title, message, I18n) => {
    return new Promise((resolve) => {
        CustomConfirmDialog.show({
            title: I18n.t(title),
            message: I18n.t(message),
            yesLabel: I18n.t('Yes'),
            noLabel: I18n.t('No'),
            onYes: () => resolve('YES'),
            onNo: () => resolve('NO')
        });
    })
};

export default AsyncAlert
