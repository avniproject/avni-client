export default class TimerActions {

    static onTimedForm(state, action, context) {
        const newState = state.clone();
        const {timerState, wizard} = newState;
        const isLastPage = wizard.isLastPage();
        TimerActions.vibrateOnQuestionDisplay(timerState, action);
        TimerActions.moveNextIfRequired(isLastPage, action, newState, context, timerState);
        timerState.onEverySecond();
        return newState;
    }

    static moveNextIfRequired(isLastPage, action, newState, context, timerState) {
        if (timerState.stayTime === 0) {
            if (isLastPage) {
                TimerActions.stopTimer(timerState, action);
            }
            timerState.addVisited(newState.formElementGroup);
            newState.handleNext(action.nextParams, context);
            if (!newState.formElementGroup.timed) {
                TimerActions.stopTimer(timerState, action);
            }
        }
    }

    static stopTimer(timerState, action) {
        timerState.stop();
        action.stopTimer();
    }

    static vibrateOnQuestionDisplay(timerState, action) {
        if (timerState.vibrate === true) {
            action.vibrate(3 * 1000);
            timerState.stopVibration();
        }
    }

    static onStartTimer(state, action, context) {
        const newState = state.clone();
        newState.timerState.start();
        action.cb();
        return newState;
    }
}
