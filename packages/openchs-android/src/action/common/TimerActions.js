export default class TimerActions {

    static onTimedForm(state, action, context) {
        const newState = state.clone();
        const {timerState, wizard} = newState;
        const isLastPage = wizard.isLastPage();
        const {startTime, time} = timerState;
        TimerActions.vibrateOnQuestionDisplay(startTime, time, action);
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

    static vibrateOnQuestionDisplay(startTime, time, action) {
        if (startTime === time) {
            action.vibrate(5 * 1000);
        }
    }

    static onStartTimer(state, action, context) {
        const newState = state.clone();
        newState.timerState.start();
        action.cb();
        return newState;
    }
}
