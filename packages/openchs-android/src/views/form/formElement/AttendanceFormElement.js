import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, View} from "react-native";
import {CheckBox, Text} from "native-base";
import Styles from "../../primitives/Styles";
import ValidationErrorMessage from "../ValidationErrorMessage";
import GroupSubjectService from "../../../service/GroupSubjectService";
import _ from 'lodash';
import Colors from "../../primitives/Colors";
import {Concept} from 'openchs-models';

class AttendanceFormElement extends AbstractFormElement {
    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        const subjectTypeUUID = _.get(this.props, 'element.concept').recordValueByKey(Concept.keys.subjectTypeUUID);
        const groupsSubjects = this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID, subjectTypeUUID);
        const subjectUUIDs = _.get(this.props.value, 'answer');
        return (
            <Fragment>
                <Text style={Styles.formLabel}>{this.label}</Text>
                <View style={{paddingVertical: 5}}>
                    {_.map(groupsSubjects, ({memberSubject}, i) => {
                        return (
                            <View key={memberSubject.uuid}
                                  style={[styles.memberContainer, i % 2 === 0 ? {backgroundColor: Colors.InputBorderNormal} : {backgroundColor: 'white'}]}>
                                <View style={{flex: .8}}>
                                    <Text style={Styles.formBodyText}>{memberSubject.nameString}</Text>
                                </View>
                                <View style={{flex: .2, alignItems: 'flex-end', marginRight: 15}}>
                                    <CheckBox
                                        onPress={() => this.dispatchAction(this.props.actionName, {
                                            formElement: this.props.element,
                                            answerUUID: memberSubject.uuid,
                                        })}
                                        checked={_.includes(subjectUUIDs, memberSubject.uuid)}/>
                                </View>
                            </View>
                        )
                    })}
                </View>
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
