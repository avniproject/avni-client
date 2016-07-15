class DecisionSupportExtension {
    constructor(questionnaireName) {
        this.questionnaireName = questionnaireName;
    }

    get functionName() {
        return this.questionnaireName.replace(/\s/g, "_") + "_getDecision";
    }
}

export default DecisionSupportExtension;