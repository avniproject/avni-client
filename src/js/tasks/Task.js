class Task {
    constructor(dispatch) {
        this.dispatch = dispatch;
        this.dispatchAction = this.dispatchAction.bind(this);
    }

    dispatchAction(action, cb) {
        return this.dispatch({"type": action, "cb": cb});
    }

    run() {

    }
}

export default Task;