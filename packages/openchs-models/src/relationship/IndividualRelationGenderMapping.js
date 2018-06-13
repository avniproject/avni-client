import IndividualRelation from "./IndividualRelation";
import Gender from "../Gender";
import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";

class IndividualRelationGenderMapping {
    static schema = {
        name: 'IndividualRelationGenderMapping',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            relation: "IndividualRelation",
            gender: "Gender",
            voided: {type: 'bool', default: false}
        }
    };

    static createEmptyInstance() {
        const individualRelationGenderMapping = new IndividualRelationGenderMapping();
        return individualRelationGenderMapping;
    }


    static fromResource(resource, entityService) {
        const relation = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "relationUUID"), IndividualRelation.schema.name);
        const gender = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "genderUUID"), Gender.schema.name);

        const individualRelationGenderMapping = General.assignFields(resource, new IndividualRelationGenderMapping(), ["uuid", "voided"]);
        individualRelationGenderMapping.relation = relation;
        individualRelationGenderMapping.gender = gender;

        return individualRelationGenderMapping;
    }

}

export default IndividualRelationGenderMapping;