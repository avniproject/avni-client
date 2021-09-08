import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {SubjectType} from "avni-models";

@Service("subjectTypeService")
class SubjectTypeService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return SubjectType.schema.name;
    }

    getAllSubjectTypesWithIcon() {
        return this.getAllNonVoided().filtered('iconFileS3Key <> null');
    }

}

export default SubjectTypeService
