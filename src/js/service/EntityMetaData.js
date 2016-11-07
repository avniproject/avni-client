import {Concept} from "../models/Concept";
import Gender from "../models/Gender";

class EntityMetaData {
    static model = [
        {entityName: "Gender", entityClass: Gender, resourceName: "gender", type: "metadata"},
        {entityName: "Concept", entityClass: Concept, resourceName: "concept", type: "metadata"}];
}

export default EntityMetaData;