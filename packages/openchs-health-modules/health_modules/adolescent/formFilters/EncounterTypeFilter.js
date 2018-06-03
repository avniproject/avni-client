import FormElementStatusBuilder from "../../../../rules-config/src/rules/builders/FormElementStatusBuilder";
import _ from 'lodash';
import RuleCondition from "../../../../rules-config/src/rules/RuleCondition";

export default class EncounterTypeFilter extends FormElementStatusBuilder{
    constructor(context, encounterTypeNames) {
        if (_.isEmpty(encounterTypeNames)) {
            throw new Error("No encounter type names provided. This filter will always return false");
        }

        super(context);
        this.encounterTypeNames = encounterTypeNames;
    }

    build() {
        const formElementStatus = super.build();
        const shouldShow = new RuleCondition(this.context).whenItem(this.context.programEncounter.encounterType.name).matchesFn(            (encounterTypeName) => {
            return _.some(this.encounterTypeNames, (validName) => validName === encounterTypeName);
        }).matches();

        formElementStatus.visibility = formElementStatus.visibility && shouldShow;

        return formElementStatus;
    }
}