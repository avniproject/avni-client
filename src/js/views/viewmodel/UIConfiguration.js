class UIConfiguration {
    static TopLeftActionMap = {
        QuestionAnswerView: "Settings",
        ConfirmationView: "Settings",
        DecisionSupportSessionListView: "Back",
        DecisionSupportSessionView: "Back",
        DecisionView: "Settings",
        QuestionnaireListView: "Settings"
    };

    static getIconName(viewName) {
        return UIConfiguration.TopLeftActionMap[viewName];
    }
}

export default UIConfiguration;