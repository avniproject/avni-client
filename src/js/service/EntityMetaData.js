import {Concept} from "../models/Concept";
import Gender from "../models/Gender";

class EntityMetaData {
    static model = [
        {entityName: "Concept", entityClass: Concept, resourceName: "concept"},
        {entityName: "Gender", entityClass: Gender, resourceName: "gender"}];
}

export default EntityMetaData;