class Range {
    minValue;
    maxValue;

    constructor(minValue, maxValue) {
        this.minValue = minValue;
        this.maxValue = maxValue;
    }

    static empty() {
        return new Range(null, null);
    }

    isEmpty() {
        return this.minValue === null && this.maxValue === null;
    }
}

export default Range;
