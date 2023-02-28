import {View} from "react-native";
import React from "react";
import _ from "lodash";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Distances from "../../primitives/Distances";
import RadioLabelValue from "../../primitives/RadioLabelValue";
import SubjectFormElement from "./SubjectFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import UserInfoService from "../../../service/UserInfoService";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";

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
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;

        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <SelectableItemGroup
                    multiSelect={false}
                    allowRadioUnselect={true}
                    inPairs={true}
                    locale={currentLocale}
                    I18n={this.I18n}
                    onPress={(value) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={(subjectUUID) => _.isEmpty(subject) ? false : subject.uuid === subjectUUID}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                />
            </View>);
    }
}

export default SingleSelectSubjectFormElement;
