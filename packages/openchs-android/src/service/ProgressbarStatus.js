class ProgressbarStatus {

    constructor(onprogress, progressSteps) {
        this.progressSteps = progressSteps;
        this.initialCount = progressSteps.length;
        this.onprogress = onprogress;

    }

    onComplete(event) {
        const index = this.progressSteps.indexOf(event);
        this.progressSteps.splice(index, 1);
        this.onprogress(1 - (this.progressSteps.length / this.initialCount));
    }

}

export default ProgressbarStatus
