import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {ListView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Separator from "../primitives/Separator";
import React from "react";
import Fonts from "../primitives/Fonts";
import _ from 'lodash';
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import {Badge} from "../common/Badge";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import Actions from "./Actions";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";
import EncounterService from "../../service/EncounterService";

class Members extends AbstractComponent {
    static propTypes = {
        groupSubjects: PropTypes.object.isRequired,
        title: PropTypes.string,
        onMemberSelection: PropTypes.func.isRequired,
        actions: PropTypes.array.isRequired,
        editAllowed: PropTypes.bool,
        removeAllowed: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
    }

    getTextComponent(text, color) {
        return <Text key={text} style={{fontSize: Styles.normalTextSize, color: color}}>{text}</Text>
    }

    renderGroupMember(groupSubject) {
        const memberSubject = groupSubject.memberSubject;
        const component = this.getTextComponent(memberSubject.name, Colors.Complimentary);
        const undoneProgramVisits = this.getService(ProgramEncounterService).getAllDueForSubject(memberSubject.uuid).length;
        const undoneGeneralVisits = this.getService(EncounterService).getAllDueForSubject(memberSubject.uuid).length;
        const roleDescription = groupSubject.getRoleDescription(this.getRelatives(groupSubject));
        return (<View style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                <Badge number={undoneProgramVisits + undoneGeneralVisits} component={component}/>
                {<Text key={roleDescription}
                       style={{marginLeft: 2, fontSize: 12}}>{this.I18n.t(roleDescription)}</Text>}
            </View>
        )
    }

    getRelatives(groupSubject) {
        const headOfHouseholdGroupSubject = groupSubject.groupSubject.getHeadOfHouseholdGroupSubject();
        return _.isEmpty(headOfHouseholdGroupSubject) ? [] : this.getService(IndividualRelationshipService).getRelatives(headOfHouseholdGroupSubject.memberSubject);
    }

    renderEnrolledPrograms(memberSubject) {
        const nonExitedEnrolledPrograms = this.getService(ProgramEnrolmentService).getAllNonExitedEnrolmentsForSubject(memberSubject.uuid);
        return _.map(nonExitedEnrolledPrograms, enl => this.getTextComponent(this.I18n.t(enl.program.operationalProgramName || enl.program.name), Colors.InputNormal))
    }

    renderRow(groupSubject, index) {
        return (
            <View key={index} style={[styles.container, {alignItems: 'center', minHeight: 20}]}>
                <TouchableOpacity onPress={() => this.props.onMemberSelection(groupSubject.memberSubject.uuid)}
                                  style={{flex: 1, alignSelf: 'center', flexWrap: 'wrap'}}>
                    {this.renderGroupMember(groupSubject)}
                </TouchableOpacity>
                <View style={{flex: 0.8, flexWrap: 'wrap'}}>
                    {this.renderEnrolledPrograms(groupSubject.memberSubject)}
                </View>
                <View style={{flex: 0.5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                    <Actions key={index} actions={this.props.actions} item={groupSubject}/>
                </View>
            </View>
        );
    }

    renderHeader() {
        return (
            <View>
                <View style={styles.container}>
                    <View style={{flex: 1, alignSelf: 'stretch'}}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), {color: Styles.blackColor}]}>{this.I18n.t('name')}</Text>
                    </View>
                    <View style={{flex: 0.8, alignSelf: 'stretch'}}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), {color: Styles.blackColor}]}>{this.I18n.t('programsEnrolled')}</Text>
                    </View>
                    <View style={{flex: 0.5, alignSelf: 'stretch'}}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), {color: Styles.blackColor}]}>{this.I18n.t('actions')}</Text>
                    </View>
                </View>
                <View style={{paddingVertical: 3}}>
                    <Separator height={1.5}/>
                </View>
            </View>
        );
    }

    render() {
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(this.props.groupSubjects);
        return (
            <ListView
                enableEmptySections={true}
                dataSource={dataSource}
                removeClippedSubviews={true}
                renderSeparator={(ig, idx) => (<Separator key={idx} height={1}/>)}
                renderHeader={() => this.renderHeader()}
                renderRow={(groupSubject, index) => this.renderRow(groupSubject, index)}
            />
        );
    }


}

export default Members;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignSelf: 'stretch',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: 6
    }
});
