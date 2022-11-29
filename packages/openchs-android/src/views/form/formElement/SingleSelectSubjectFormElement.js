import {View} from "react-native";
import React from "react";
import _ from "lodash";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Distances from "../../primitives/Distances";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import SubjectFormElement from "./SubjectFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class SingleSelectSubjectFormElement extends SubjectFormElement {

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const subject = _.get(this.props.value, 'answer') ? this.individualService.findByUUID(this.props.value.answer) : null;
        const subjectOptions = this.getSubjectOptions();
        if (!_.isEmpty(subjectOptions) && subjectOptions.length <= this.SWITCH_TO_SEARCH_UI_THRESHOLD) {
            return this.renderSelectUI(subject, subjectOptions);
        } else {
            return this.renderSearchUI(subject);
        }
    }

    renderSearchUI(subject) {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
                    <FormElementLabelWithDocumentation element={this.props.element}/>
                    {this.renderSearchIcon()}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {this.renderAnswer(subject)}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        )
    }

    renderSelectUI(subject, subjectOptions) {
        const valueLabelPairs = subjectOptions
            .map((subject) => new RadioLabelValue(subject.nameStringWithUniqueAttribute, subject.uuid, false));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
                    allowRadioUnselect={true}
                    multiSelect={false}
                    inPairs={true}
                    onPress={({label, value}) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={(subjectUUID) => _.isEmpty(subject) ? false : subject.uuid === subjectUUID}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}/>
            </View>);
    }
}

export default SingleSelectSubjectFormElement;
