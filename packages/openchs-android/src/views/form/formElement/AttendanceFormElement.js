import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, TouchableOpacity, View, Text} from "react-native";
import {Checkbox as CheckBox} from "native-base";
import ValidationErrorMessage from "../ValidationErrorMessage";
import GroupSubjectService from "../../../service/GroupSubjectService";
import _ from 'lodash';
import Colors from "../../primitives/Colors";
import {Concept} from 'openchs-models';
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import SubjectInfoCard from "../../common/SubjectInfoCard";
import Separator from "../../primitives/Separator";

class AttendanceFormElement extends AbstractFormElement {
    getGroupsSubjects() {
        const subjectTypeUUID = _.get(this.props, 'element.concept').recordValueByKey(Concept.keys.subjectTypeUUID);
        const members = this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID, subjectTypeUUID).map(_.identity);
        // Obey the form element rule: same allow/exclude semantics the value pruning
        // (ObservationsHolder.removeNonApplicableSubjectAnswers) applies, so display and
        // saved selections stay in sync.
        const applicableUUIDs = this.props.element.getApplicableSubjectUUIDs();
        const excludedUUIDs = this.props.element.getExcludedSubjectUUIDs();
        return members.filter(({memberSubject}) => {
            if (applicableUUIDs && !_.includes(applicableUUIDs, memberSubject.uuid)) return false;
            return !_.includes(excludedUUIDs, memberSubject.uuid);
        });
    }

    renderSubject({memberSubject}, subjectUUIDs) {
        const onPress = () => {
            this.dispatchAction(this.props.actionName, {
                formElement: this.props.element, 
                answerUUID: memberSubject.uuid,
                parentFormElement: this.props.parentElement, 
                questionGroupIndex: this.props.questionGroupIndex
            });
        };
        const isChecked = _.includes(subjectUUIDs, memberSubject.uuid);
        return (<TouchableOpacity style={{paddingVertical: 5}} onPress={onPress}>

            <View key={memberSubject.uuid}
                  style={styles.memberContainer}>
                <View style={{flex: .8}}>
                    <SubjectInfoCard individual={memberSubject}/>
                </View>
                <View style={{flex: .2, alignItems: 'flex-end', marginRight: 15}}>
                    <CheckBox onPress={onPress} isChecked={isChecked}/>
                </View>
            </View>
            <Separator backgroundColor={Colors.InputBorderNormal}/>
        </TouchableOpacity>)
    }

    handleSelectPress = (groupsSubjects, subjectUUIDs, selected) => {
        const isNeedOperation = !selected;
        const uuidsToToggle = [];
        _.forEach(groupsSubjects, ({ memberSubject }) => {
            const isMemberSubjectSelected = subjectUUIDs.includes(memberSubject.uuid);

            if ((isNeedOperation && !isMemberSubjectSelected) || (!isNeedOperation && isMemberSubjectSelected)) {
                uuidsToToggle.push(memberSubject.uuid);
            }
        });
        if (!_.isEmpty(uuidsToToggle)) {
            this.dispatchAction(this.props.actionName, {
                formElement: this.props.element,
                answerUUIDs: uuidsToToggle,
                parentFormElement: this.props.parentElement,
                questionGroupIndex: this.props.questionGroupIndex
            });
        }
    };

    render() {
        const groupsSubjects = this.getGroupsSubjects();
        const groupSize = _.size(groupsSubjects);
        const subjectUUIDs = _.get(this.props.value, 'answer') || [];
        const selected = groupSize === _.size(subjectUUIDs);
        const selectAllLabel = selected ? this.I18n.t("unselectAllLabel") : this.I18n.t("selectAllLabel");

        return (
            <Fragment>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {groupSize>0 && this.props.element.isMultiSelect() && <TouchableOpacity onPress={()=>this.handleSelectPress(groupsSubjects,subjectUUIDs,selected)}>
                    <Text style={{color: 'blue', textAlign: 'right', textDecorationLine: 'underline'}} >{selectAllLabel}</Text>
                </TouchableOpacity>}
                { _.map(groupsSubjects, (groupSubject, index) =>
                    this.renderSubject(groupSubject, subjectUUIDs)
                )}
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </Fragment>
        )
    }
}

export default AttendanceFormElement;

const styles = StyleSheet.create({
    memberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 5,
    }
});
