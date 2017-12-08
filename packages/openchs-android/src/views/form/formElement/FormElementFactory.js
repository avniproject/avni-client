import DurationDateFormElement from "./DurationDateFormElement";
import MultiSelectFormElement from "./MultiSelectFormElement";
import SingleSelectFormElement from "./SingleSelectFormElement";
import NumericFormElement from "./NumericFormElement";
import TextFormElement from "./TextFormElement";
import SelectFormElement from "./SelectFormElement";
import DateFormElement from "./DateFormElement";
import {Concept, FormElement} from 'openchs-models';

export default class FormElementFactory {
    static viewMap = {
        Date: DateFormElement,
        Duration: DurationDateFormElement,
        SingleSelect: SingleSelectFormElement,
        MultiSelect: MultiSelectFormElement,
        Numeric: NumericFormElement,
        Text: TextFormElement
    };

    static get(formElement, props) {
        const AppropriateFormElement = FormElement.viewMap[formElement.getType()];
        return (<AppropriateFormElement formElement={formElement} {...props}/>);
    }

}