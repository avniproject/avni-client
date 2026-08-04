import {assert} from "chai";
import IntegrationTestRunner from "../../integrationTest/IntegrationTestRunner";
import EdgeModelParityIntegrationTest from "../../integrationTest/EdgeModelParityIntegrationTest";

// IntegrationTestRunner treats every own prototype method except constructor/setup/teardown as a
// test, and the class-level Run button calls runClass, which runs all of them. A helper left on the
// prototype is therefore invoked with no arguments and fails — a red mark that means nothing, on the
// very button verify/README.md tells the operator to press.
describe("EdgeModelParityIntegrationTest method discovery", () => {
    it("exposes runParitySweep as the only test method", () => {
        const runner = new IntegrationTestRunner(EdgeModelParityIntegrationTest);
        const discovered = runner.testSuite.testMethods.map((testMethod) => testMethod.methodName);
        assert.deepEqual(discovered, ["runParitySweep"]);
    });
});
