import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, View} from "react-native";
import {Text} from "native-base";
import Styles from "../../primitives/Styles";
import ValidationErrorMessage from "../ValidationErrorMessage";
import {Switch} from "native-base";
import GroupSubjectService from "../../../service/GroupSubjectService";
import _ from 'lodash';
import Colors from "../../primitives/Colors";
import Distances from "../../primitives/Distances";

class AttendanceFormElement extends AbstractFormElement {
    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        const groupsSubjects = this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID);
        const subjectUUIDs = _.get(this.props.value, 'answer');
        return (
            <Fragment>
                <Text style={Styles.formLabel}>{this.label}</Text>
                <View style={styles.container}>
                    {_.map(groupsSubjects, ({memberSubject}) => {
                        return (
                            <View key={memberSubject.uuid} style={styles.memberContainer}>
                                <View style={{flex: 10}}>
                                    <Text style={Styles.formBodyText}>{memberSubject.nameString}</Text>
                                </View>
                                <View style={{flex: 2}}>
                                    <Switch
                                        value={_.includes(subjectUUIDs, memberSubject.uuid)}
                                        onValueChange={() => this.dispatchAction(this.props.actionName, {
                                            formElement: this.props.element,
                                            answerUUID: memberSubject.uuid,
                                        })}/>
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
    container: {
        borderWidth: 1,
        borderRadius: 1,
        borderStyle: 'dashed',
        borderColor: Colors.InputBorderNormal,
        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
        paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
    },
    memberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10
    }
});
