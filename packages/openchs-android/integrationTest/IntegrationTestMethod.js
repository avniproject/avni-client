import _ from "lodash";

export class IntegrationTestMethod {
    testClass;
    methodName;
    successful;

    constructor(testClass, methodName) {
        this.testClass = testClass;
        this.methodName = methodName;
    }

    toString() {
        return `${this.className}.${this.methodName}`;
    }

    get className() {
        return this.testClass.name;
    }

    success() {
        this.successful = true;
    }

    isSuccessful() {
        return this.hasRun() && this.successful;
    }

    isFailure() {
        return this.hasRun() && !this.successful;
    }

    ignored() {
        return this.methodName.startsWith("ignore");
    }

    failure(error) {
        this.successful = false;
        this.error = error;
    }

    hasRun() {
        return !_.isNil(this.successful);
    }
}
