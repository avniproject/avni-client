import ReferenceEntity from "./ReferenceEntity";

class IndividualRelation extends ReferenceEntity {
    static schema = {
        name: 'IndividualRelation',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string"
        }
    };

    static createEmptyInstance() {
        const individualRelation = new IndividualRelation();
        return individualRelation;
    }

    clone() {
        return super.clone(new IndividualRelation());
    }


    static fromResource(resource) {
        return ReferenceEntity.fromResource(resource, new IndividualRelation());
    }

}

export default IndividualRelation;