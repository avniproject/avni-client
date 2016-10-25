class TestContext {
    getService() {
        return {
            "getI18n": function () {
                return {
                    t: function (t) {
                        return t;
                    }
                };
            },
            "getDecision": function () {
                return [{name: "Treatment", code: "ABC001", value: "The patient should be referred to the hospital immediately as he may having tuberculosis", alert: "ALERT MESSAGE"}]
            }
        };
    }

    navigator() {
    }
}

export default TestContext;