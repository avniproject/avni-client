import moment from "moment";
import _ from "lodash";

export default class TimerState {
    constructor(startTime, stayTime, displayQuestions = false) {
        this.startTime = startTime;
        this.stayTime = stayTime;
        this.time = 0;
        this.startTimer = false;
        this.displayQuestions = displayQuestions;
        this.visitedGroupUUIDs = [];
        this.vibrate = false;
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
        newState.startingSystemTime = this.startingSystemTime;
        newState.vibrate = this.vibrate;
        return newState;
    }

    start() {
        this.startTimer = true;
        this.startingSystemTime = moment();
    }

    stop() {
        this.startTimer = false;
        this.time = 0;
        this.startingSystemTime = null;
    }

    stopVibration() {
        this.vibrate = false;
    }

    addVisited(formElementGroup) {
        if (this.hasNotVisited(formElementGroup)) {
            this.visitedGroupUUIDs.push(_.get(formElementGroup, 'uuid'));
        }
    }

    hasNotVisited(formElementGroup) {
        return formElementGroup.timed ? !_.includes(this.visitedGroupUUIDs, _.get(formElementGroup, 'uuid')) : false;
    }

    isPreviousNotAllowed(formElementGroup) {
        return this.hasNotVisited(formElementGroup) && this.startTimer;
    }

    calculateStayTime(timeElapsed) {
        if(this.stayTime === 0 || _.isNil(this.stayTime))
            return this.stayTime;
        else if (this.displayQuestions === false) {
            this.vibrate = true;
            return this.stayTime;
        }
        else
            return this.stayTime - timeElapsed;
    }

    onEverySecond() {
        let previousTime = this.time;
        this.time = moment.duration(moment().diff(this.startingSystemTime || moment())).asSeconds();
        let timeElapsed = this.time - previousTime;
        if (this.time >= this.startTime) {
            this.stayTime = this.calculateStayTime(timeElapsed);
            this.stayTime > 0 ? this.displayQuestions = true : this.stayTime = 0;
        }
    }

    resetForNextPage(formElementGroup) {
        this.stayTime = formElementGroup.stayTime;
        this.startTime = formElementGroup.startTime;
        this.displayQuestions = !this.hasNotVisited(formElementGroup);
    }

    resetForPrevious() {
        this.displayQuestions = true;
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
