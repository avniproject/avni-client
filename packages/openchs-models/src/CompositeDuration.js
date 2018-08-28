import Duration from "./Duration";
import _ from "lodash";

class CompositeDuration {
    constructor(durations) {
        this.durations = durations;
    }

    changeValue(duration, value) {
        return new CompositeDuration(this.durations
            .map((d) => d.durationUnit === duration.durationUnit ? d.changeValue(value) : d));
    }

    get isEmpty() {
        return !this.durations.some(d => !d.isEmpty);
    }

    toString(i18n) {
        return this.durations.map((d) => d.toString(i18n)).join(" ");
    }

    cloneForEdit() {
        return new CompositeDuration(this.durations.map(d => d.cloneForEdit()));
    }

    getValue() {
        return this;
    }

    static fromOpts(durationOptions) {
        return new CompositeDuration(durationOptions.map(opt => new Duration(null, opt)));
    }

    get toResource() {
        return {durations: this.durations.map(d => d.toResource)};
    }

    static fromObs(obs) {
        if (_.isNil(obs.durations)) {
            return new CompositeDuration(obs.map(Duration.fromObs));
        }
        return new CompositeDuration(obs.durations.map(Duration.fromObs));
    }
}

export default CompositeDuration;