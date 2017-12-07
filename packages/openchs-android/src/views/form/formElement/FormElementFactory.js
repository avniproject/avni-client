import DurationDateFormElement from "./DurationDateFormElement";
import MultiSelectFormElement from "./MultiSelectFormElement";
import SingleSelectFormElement from "./SingleSelectFormElement";
import NumericFormElement from "./NumericFormElement";
import TextFormElement from "./TextFormElement";
import SelectFormElement from "./SelectFormElement";
import DateFormElement from "./DateFormElement";

export default class FormElementFactory {
    static viewMap = {
        Date: DateFormElement,
        Duration: DurationDateFormElement,
        Coded: SelectFormElement,
        Numeric: NumericFormElement,
        Text: TextFormElement
    };

    static get(formElement, props) {
        const AppropriateFormElement = FormElement.viewMap[concept.datatype];
        return (<AppropriateFormElement formElement={formElement} {...props}/>);
    }

}