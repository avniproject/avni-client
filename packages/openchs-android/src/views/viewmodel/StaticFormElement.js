import {Concept} from "openchs-models";

class StaticFormElement {
    constructor(name, mandatory, datatype, keyValues = []) {
        this.name = name;
        this.mandatory = mandatory;
        this.keyValues = keyValues;
        this.concept =  Concept.create(name, datatype, keyValues);
    }
}

export default StaticFormElement;