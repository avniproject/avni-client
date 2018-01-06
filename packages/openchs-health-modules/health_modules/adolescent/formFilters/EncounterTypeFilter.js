import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";
import _ from 'lodash';

export default class EncounterTypeFilter extends FormElementStatusBuilder{
    constructor(context, encounterTypeNames) {
        super(context);
        this.encounterTypeNames = encounterTypeNames;
    }

    build() {
        this.show().and.whenItem(this.context.programEncounter.encounterType.name).matchesFn(
            (encounterTypeName) => {
                return _.some(this.encounterTypeNames, (validName) => validName === encounterTypeName);
            }
        );
        return super.build();
    }
}