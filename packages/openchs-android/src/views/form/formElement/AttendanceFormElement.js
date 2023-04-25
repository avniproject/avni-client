import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, TouchableOpacity, View} from "react-native";
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
    constructor(props, context) {
        super(props, context);
    }

    renderSubject({memberSubject}, subjectUUIDs, index) {
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

    render() {
        const subjectTypeUUID = _.get(this.props, 'element.concept').recordValueByKey(Concept.keys.subjectTypeUUID);
        const groupsSubjects = this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID, subjectTypeUUID).map(_.identity);
        const subjectUUIDs = _.get(this.props.value, 'answer');
        return (
            <Fragment>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                { _.map(groupsSubjects, (groupSubject, index) =>
                    this.renderSubject(groupSubject, subjectUUIDs, index)
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
