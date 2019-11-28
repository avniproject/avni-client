import EntityTypeChoiceState from "../common/EntityTypeChoiceState";
import _ from "lodash";
import {  Individual  } from 'avni-models';

export class FamilyProfileActions {

    static cloneEntity(entity) {
        if (!_.isNil(entity))
            return entity.cloneForEdit();
    }

    static getInitialState() {
        return new EntityTypeChoiceState(Individual.createEmptyInstance(), FamilyProfileActions.setProgram, FamilyProfileActions.cloneEntity);
    }


}

const actions = {
};

export default new Map([
]);

export {actions as Actions};