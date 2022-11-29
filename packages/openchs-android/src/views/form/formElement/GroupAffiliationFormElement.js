import AbstractFormElement from "./AbstractFormElement";
import React from "react";
import PropTypes from "prop-types";
import {View} from "react-native";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import Distances from "../../primitives/Distances";
import _ from "lodash";
import IndividualService from "../../../service/IndividualService";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class GroupAffiliationFormElement extends AbstractFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        validationResult: PropTypes.object,
        groupSubjectObservation: PropTypes.object,
    };

    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
        this.individualService = context.getService(IndividualService);
    }

    onPress(groupSubjectUUID) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            groupSubjectRoleUUID: this.props.element.recordValueByKey('groupSubjectRoleUUID'),
            groupSubjectUUID,
        });
    }

    groupsToShow() {
        const answersToShow = this.props.element.answersToShow;
        const allGroups = this.individualService.getAllBySubjectTypeUUID(this.props.element.recordValueByKey('groupSubjectTypeUUID'));
        return !_.isEmpty(answersToShow) ? _.filter(allGroups, ({uuid}) => _.includes(answersToShow, uuid)) : allGroups;
    }

    render() {
        const groupSubjectObservation = this.props.groupSubjectObservation;
        const valueLabelPairs = this.groupsToShow().map((subject) => new RadioLabelValue(subject.nameString, subject.uuid));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {!_.isEmpty(this.props.actionName) &&
                <RadioGroup
                    allowRadioUnselect={true}
                    multiSelect={false}
                    inPairs={true}
                    onPress={({label, value}) => this.onPress(value)}
                    selectionFn={(groupSubjectUUID) => _.isEmpty(groupSubjectObservation) ? false : groupSubjectObservation.groupSubject.groupSubject.uuid === groupSubjectUUID}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                    skipLabel={true}
                />}
            </View>);
    }

}

export default GroupAffiliationFormElement
