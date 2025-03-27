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
import MessageService from "../../../service/MessageService";

class AttendanceFormElement extends AbstractFormElement {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        const groupsSubjects = this.getGroupsSubjects();
        const subjectUUIDs = _.get(this.props.value, 'answer');
        this.state = {
            selected: _.size(groupsSubjects) === _.size(subjectUUIDs),
        };
    }

    getGroupsSubjects() {
        const subjectTypeUUID = _.get(this.props, 'element.concept').recordValueByKey(Concept.keys.subjectTypeUUID);
        return this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID, subjectTypeUUID).map(_.identity);
    }

    renderSubject({memberSubject}, subjectUUIDs) {
        const onPress = () => this.dispatchAction(this.props.actionName, {
            formElement: this.props.element, answerUUID: memberSubject.uuid
        });
        return (<TouchableOpacity style={{paddingVertical: 5}} onPress={onPress}>

            <View key={memberSubject.uuid}
                  style={styles.memberContainer}>
                <View style={{flex: .8}}>
                    <SubjectInfoCard individual={memberSubject}/>
                </View>
                <View style={{flex: .2, alignItems: 'flex-end', marginRight: 15}}>
                    <CheckBox onPress={onPress} isChecked={_.includes(subjectUUIDs, memberSubject.uuid)}/>
                </View>
            </View>
            <Separator backgroundColor={Colors.InputBorderNormal}/>
        </TouchableOpacity>)
    }

    handleSelectPress = (groupsSubjects, subjectUUIDs) => {
        const { selected } = this.state;
        const isNeedOperation = !selected;
        this.setState({ selected: isNeedOperation }, () => {
            _.forEach(groupsSubjects, ({ memberSubject }) => {
                const isMemberSubjectSelected = subjectUUIDs.includes(memberSubject.uuid);
                if ((isNeedOperation && !isMemberSubjectSelected) || (!isNeedOperation && isMemberSubjectSelected)) {
                    this.dispatchAction(this.props.actionName, {
                        formElement: this.props.element,
                        answerUUID: memberSubject.uuid
                    });
                }
            });
        });
    };


    componentDidUpdate(prevProps, prevState) {
        const groupsSubjects = this.getGroupsSubjects();
        const subjectUUIDs = _.get(this.props.value, 'answer');
        const shouldSelectAll = _.size(subjectUUIDs) === _.size(groupsSubjects);
        if (shouldSelectAll !== prevState.selected) {
            this.setState({ selected: shouldSelectAll });
        }
    }

    render() {
        const groupsSubjects = this.getGroupsSubjects();
        const groupSize = _.size(groupsSubjects);
        const subjectUUIDs = _.get(this.props.value, 'answer');
        const selectAllLabel = this.state.selected ? this.I18n.t("unselectAllLabel") : this.I18n.t("selectAllLabel");
        return (
            <Fragment>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {groupSize>0 && <TouchableOpacity onPress={()=>this.handleSelectPress(groupsSubjects,subjectUUIDs)}>
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
