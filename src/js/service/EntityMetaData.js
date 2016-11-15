import {Concept} from "../models/Concept";
import Gender from "../models/Gender";
import AddressLevel from "../models/AddressLevel";
import Individual from "../models/Individual";

class EntityMetaData {
    static model = [
        {entityName: "AddressLevel", entityClass: AddressLevel, resourceName: "addressLevel", type: "reference"},
        {entityName: "Gender", entityClass: Gender, resourceName: "gender", type: "reference"},
        {entityName: "Concept", entityClass: Concept, resourceName: "concept", type: "reference"},
        {entityName: "Individual", entityClass: Individual, resourceName: "individual", type: "tx"}
    ];
}

export default EntityMetaData;