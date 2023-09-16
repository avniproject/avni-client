class IntegrationTestMethod {
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

    ignored() {
        return this.methodName.startsWith("ignore");
    }

    failure(error) {
        this.successful = false;
        this.error = error;
    }
}

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
}

const nonTestMethods = ["constructor", "setup", "teardown"];

class IntegrationTestRunner {
    testSuite;

    constructor(...testClasses) {
        this.testSuite = new TestSuite();
        testClasses.forEach((testClass) => {
            const testMethods = Object.getOwnPropertyNames(testClass.prototype).filter((method) => !nonTestMethods.includes(method));
            testMethods.forEach((testMethod) => {
                const integrationTestMethod = new IntegrationTestMethod(testClass, testMethod);
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
