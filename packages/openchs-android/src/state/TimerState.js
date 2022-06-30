import moment from "moment";

export default class TimerState {
    constructor(startTime = 0, stayTime = 0) {
        this.startTime = startTime;
        this.stayTime = stayTime;
        this.time = 0;
        this.startTimer = false;
        this.displayQuestions = false;
        this.displayNext = false;
        this.displayPrevious = false;
    }

    clone() {
        const newState = new TimerState(this.startTime, this.stayTime);
        newState.startTime = this.startTime;
        newState.stayTime = this.stayTime;
        newState.time = this.time;
        newState.startTimer = this.startTimer;
        newState.displayQuestions = this.displayQuestions;
        newState.displayNext = this.displayNext;
        newState.displayPrevious = this.displayPrevious;
        return newState;
    }

    start() {
        this.startTimer = true;
    }

    displayNextButton() {
        this.displayNext = true;
    }

    hideWizardButtons() {
        this.displayNext = false;
        this.displayPrevious = false;
    }

    displayPreviousButton() {
        this.displayPrevious = true;
    }

    onEverySecond() {
        this.time = this.time + 1;
        if (this.time >= this.startTime) {
            this.stayTime = this.stayTime === 0 ? this.stayTime : this.stayTime - 1;
            if (this.stayTime > 0) {
                this.displayQuestions = true;
            }
        }
    }

    resetForNextPage(formElementGroup) {
        this.stayTime = formElementGroup.stayTime;
        this.startTime = formElementGroup.startTime;
        this.displayQuestions = false;
        this.displayNext = false;
        this.displayPrevious = false;
    }

    displayString() {
        const countDownTime = this.time >= this.startTime ? this.stayTime : this.startTime - this.time;
        const countUpTime = this.time;
        return `${moment.utc(countUpTime * 1000).format('HH:mm:ss')}/${moment.utc(countDownTime * 1000).format('HH:mm:ss')}`
    }
}
