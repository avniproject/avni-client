import {View} from "react-native";
import React from "react";
import _ from "lodash";
import SubjectFormElement from "./SubjectFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Distances from "../../primitives/Distances";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class MultiSelectSubjectFormElement extends SubjectFormElement {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        const subjectUUIDs = _.get(this.props.value, 'answer');
        const subjectOptions = this.getSubjectOptions();
        if (!_.isEmpty(subjectOptions) && subjectOptions.length <= this.SWITCH_TO_SEARCH_UI_THRESHOLD) {
            return this.renderSelectUI(subjectUUIDs, subjectOptions);
        } else {
            return this.renderSearchUI(subjectUUIDs);
        }
    }

    renderSearchUI(subjectUUIDs) {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'}}>
                    <FormElementLabelWithDocumentation element={this.props.element}/>
                    {this.renderSearchIcon()}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {_.map(subjectUUIDs, subjectUUID => this.renderAnswer(this.individualService.findByUUID(subjectUUID)))}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        )
    }

    renderSelectUI(subjectUUIDs, subjectOptions) {
        const valueLabelPairs = subjectOptions
            .map((subject) => new RadioLabelValue(subject.nameStringWithUniqueAttribute, subject.uuid, false));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
                    multiSelect={true}
                    inPairs={true}
                    onPress={({label, value}) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={(subjectUUID) => subjectUUIDs.indexOf(subjectUUID) !== -1}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}/>
            </View>);
    }
}

export default MultiSelectSubjectFormElement;
