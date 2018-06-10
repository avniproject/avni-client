import ResourceUtil from "./utility/ResourceUtil";
import General from "./utility/General";
import IndividualRelation from "./IndividualRelation";

class IndividualReverseRelation {
    static schema = {
        name: 'IndividualReverseRelation',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            relationUUID: 'string',
            genderUUID: 'string',
            reverseRelation: "IndividualRelation"
        }
    };

    static createEmptyInstance() {
        const individualReverseRelation = new IndividualReverseRelation();
        return individualReverseRelation;
    }

    clone() {
        return super.clone(new IndividualReverseRelation());
    }


    static fromResource(resource, entityService) {
        const reverseRelation = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "reverseRelationUUID"), IndividualRelation.schema.name);

        const reverseRelationEntity = General.assignFields(resource, new IndividualReverseRelation(), ["uuid", "voided"]);
        reverseRelationEntity.relationUUID = ResourceUtil.getUUIDFor(resource, "relationUUID");
        reverseRelationEntity.genderUUID = ResourceUtil.getUUIDFor(resource, "genderUUID");
        reverseRelationEntity.reverseRelation = reverseRelation;

        return reverseRelationEntity;
    }

}

export default IndividualReverseRelation;