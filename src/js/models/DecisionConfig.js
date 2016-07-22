class DecisionConfig {
    static schema = {
        name: "DecisionConfig",
        primaryKey: "fileName",
        properties: {
            fileName: "string",
            decisionCode: "string"
        }
    };

    static toDB = (fileName, decisionCode) => {
        return {"decisionCode": decisionCode, "fileName": fileName.toLowerCase()};
    };
}

export default DecisionConfig;