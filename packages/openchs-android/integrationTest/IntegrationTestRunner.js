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

    failure(error) {
        this.successful = false;
        this.error = error;
    }
}

export class IntegrationTests {
    testMethods;

    constructor() {
        this.testMethods = [];
    }

    push(testMethod) {
        this.testMethods.push(testMethod);
    }

    clone() {
        const integrationTests = new IntegrationTests();
        integrationTests.testMethods = [...this.testMethods];
        return integrationTests;
    }
}

class IntegrationTestRunner {
    integrationTests;

    constructor(...testClasses) {
        this.integrationTests = new IntegrationTests();
        testClasses.forEach((testClass) => {
            const testMethods = Object.getOwnPropertyNames(testClass.prototype).filter((method) => method !== "constructor");
            testMethods.forEach((testMethod) => {
                const integrationTestMethod = new IntegrationTestMethod(testClass, testMethod);
                this.integrationTests.push(integrationTestMethod);
            });
        });
    }

    run(notify) {
        this.integrationTests.testMethods.forEach((testMethod) => {
            console.log("IntegrationTestRunner", "Running", testMethod.toString());
            try {
                new testMethod.testClass()[testMethod.methodName]();
                testMethod.success();
            } catch (error) {
                console.error("IntegrationTestRunner", testMethod.toString(), error);
                testMethod.failure(error);
            } finally {
                notify(this.integrationTests.clone());
            }
        });
    }
}

export default IntegrationTestRunner;
