import {View} from "react-native";
import React from "react";
import _ from "lodash";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Distances from "../../primitives/Distances";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import SubjectFormElement from "./SubjectFormElement";

class SingleSelectSubjectFormElement extends SubjectFormElement {

    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        const subject = _.get(this.props.value, 'answer') ? this.individualService.findByUUID(this.props.value.answer) : null;
        if (!_.isEmpty(this.subjectOptions) && this.subjectOptions.length <= this.SWITCH_TO_SEARCH_UI_THRESHOLD) {
            return this.renderSelectUI(subject);
        } else {
            return this.renderSearchUI(subject);
        }
    }

    renderSearchUI(subject) {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    {this.label}
                    {this.renderSearchIcon()}
                </View>
                <View style={{flexDirection: 'row'}}>
                    {this.renderAnswer(subject)}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        )
    }

    renderSelectUI(subject) {
        const valueLabelPairs = this.subjectOptions
            .map((subject) => new RadioLabelValue(subject.nameString, subject.uuid, false));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
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
