import _ from "lodash";
import General from "../src/utility/General";

export class TestSuite {
    testMethods;

    constructor() {
        this.testMethods = [];
    }

    push(testMethod) {
        this.testMethods.push(testMethod);
    }

    getMethods(testClass) {
        return this.testMethods.filter((x) => x.testClass.name === testClass.name);
    }

    clone() {
        const integrationTests = new TestSuite();
        integrationTests.testMethods = [...this.testMethods];
        return integrationTests;
    }

    getStatus(testClass) {
        const classTestMethods = this.testMethods.filter((x) => x.testClass === testClass);
        return classTestMethods.reduce((acc, x) => {
                let returnValue;
                if (!x.hasRun()) {
                    returnValue = acc;
                } else if (_.isNil(acc)) {
                    returnValue = x.isSuccessful();
                } else {
                    returnValue = acc && x.isSuccessful();
                }
                return returnValue;
            },
            null);
    }
}
