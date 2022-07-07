import moment from "moment";

export default class TimerState {
    constructor(startTime, stayTime, displayQuestions = false) {
        this.startTime = startTime;
        this.stayTime = stayTime;
        this.time = 0;
        this.startTimer = false;
        this.displayQuestions = displayQuestions;
        this.visitedGroupUUIDs = [];
    }

    displayTimer(formElementGroup) {
        return this.hasNotVisited(formElementGroup);
    }

    clone() {
        const newState = new TimerState(this.startTime, this.stayTime);
        newState.startTime = this.startTime;
        newState.stayTime = this.stayTime;
        newState.time = this.time;
        newState.startTimer = this.startTimer;
        newState.displayQuestions = this.displayQuestions;
        newState.visitedGroupUUIDs = this.visitedGroupUUIDs;
        return newState;
    }

    start() {
        this.startTimer = true;
    }

    stop() {
        this.startTimer = false;
        this.time = 0;
    }

    addVisited(formElementGroup) {
        if (this.hasNotVisited(formElementGroup)) {
            this.visitedGroupUUIDs.push(_.get(formElementGroup, 'uuid'));
        }
    }

    hasNotVisited(formElementGroup) {
        return formElementGroup.timed ? !_.includes(this.visitedGroupUUIDs, _.get(formElementGroup, 'uuid')) : false;
    }

    onEverySecond() {
        this.time = this.time + 1;
        if (this.time >= this.startTime) {
            this.stayTime = this.stayTime === 0 || _.isNil(this.stayTime) ? this.stayTime : this.stayTime - 1;
            if (this.stayTime > 0) {
                this.displayQuestions = true;
            }
        }
    }

    resetForNextPage(formElementGroup) {
        this.stayTime = formElementGroup.stayTime;
        this.startTime = formElementGroup.startTime;
        this.displayQuestions = !this.hasNotVisited(formElementGroup);
    }

    displayObject() {
        const display = {countUpTime: moment.utc(this.time * 1000).format('HH:mm:ss'), countDownTime: null};
        if (this.displayQuestions) {
            const countDownTime = this.time >= this.startTime ? this.stayTime : this.startTime - this.time;
            display.countDownTime = moment.utc(countDownTime * 1000).format('HH:mm:ss');
        }
        return display
    }
}
