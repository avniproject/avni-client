export default class TimerActions {

    static onTimedForm(state, action, context) {
        const newState = state.clone();
        const {timerState, formElementGroup, wizard} = newState;
        const isLastPage = wizard.isLastPage();
        const isFirstPage = wizard.isFirstFormPage();
        const isFormPage = !wizard.isNonFormPage();
        const {stayTime, startTime, time} = timerState;
        TimerActions.handleWizardButtons(isFormPage, isLastPage, formElementGroup, timerState, isFirstPage);
        TimerActions.vibrateOnQuestionDisplay(startTime, time, action);
        TimerActions.oveNextIfRequired(stayTime, isLastPage, action, newState, context, timerState);
        timerState.onEverySecond();
        return newState;
    }

    static oveNextIfRequired(stayTime, isLastPage, action, newState, context, timerState) {
        if (stayTime === 0) {
            if (isLastPage) {
                action.stopTimer();
            }
            newState.handleNext(action.nextParams, context);
            timerState.hideWizardButtons();
        }
    }

    static vibrateOnQuestionDisplay(startTime, time, action) {
        if (startTime === time) {
            action.vibrate(5 * 1000);
        }
    }

    static handleWizardButtons(isFormPage, isLastPage, formElementGroup, timerState, isFirstPage) {
        if (isFormPage && !isLastPage) {
            const nextFormElementGroup = formElementGroup.next();
            if (nextFormElementGroup.startTime === formElementGroup.startTime) {
                timerState.displayNextButton();
            }
        }
        if (isFormPage && !isFirstPage) {
            const previousFormElementGroup = formElementGroup.previous();
            if (previousFormElementGroup.startTime === formElementGroup.startTime) {
                timerState.displayPreviousButton();
            }
        }
    }

    static onStartTimer(state, action, context) {
        const newState = state.clone();
        newState.timerState.start();
        action.cb();
        return newState;
    }
}
