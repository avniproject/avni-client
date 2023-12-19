import _ from 'lodash';
import {IntegrationTestMethod} from "./IntegrationTestMethod";
import {TestSuite} from "./TestSuite";

const nonTestMethods = ["constructor", "setup", "teardown"];

class IntegrationTestRunner {
    testSuite;

    constructor(...testClasses) {
        this.testSuite = new TestSuite();
        testClasses.forEach((testClass) => {
            const testMethodNames = Object.getOwnPropertyNames(testClass.prototype).filter((method) => !nonTestMethods.includes(method));
            testMethodNames.forEach((testMethodName) => {
                const integrationTestMethod = new IntegrationTestMethod(testClass, testMethodName);
                this.testSuite.push(integrationTestMethod);
            });
        });
    }

    run(notify, throwError = false) {
        this.runMethods(this.testSuite.testMethods, notify, throwError);
    }

    runClass(notify, testClass, throwError = false) {
        this.runMethods(this.testSuite.getMethods(testClass), notify, throwError);
    }

    runMethods(testMethods, notify, throwError) {
        testMethods.forEach((testMethod: IntegrationTestMethod) => {
            if (!testMethod.ignored())
                this.runMethod(notify, testMethod, throwError);
        });
    }

    runMethod(notify, testMethod, throwError = false) {
        try {
            console.log("IntegrationTestRunner", "Running", testMethod.toString());
            const testObject = new testMethod.testClass();
            if (_.isFunction(testObject.setup))
                testObject.setup();
            testObject[testMethod.methodName]();
            if (_.isFunction(testObject.tearDown))
                testObject.tearDown();
            testMethod.success();
        } catch (error) {
            console.error("IntegrationTestRunner", testMethod.toString(), error, error.stack);
            testMethod.failure(error);
            if (throwError)
                throw error;
        } finally {
            this.testSuite = this.testSuite.clone();
            notify(this.testSuite);
        }
    }
}

export default IntegrationTestRunner;
