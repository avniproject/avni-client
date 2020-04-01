import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {ListView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Separator from "../primitives/Separator";
import React from "react";
import Fonts from "../primitives/Fonts";
import _ from 'lodash';
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import PopupMenu from "../common/PopupMenu";
import ProgramEncounterService from "../../service/program/ProgramEncounterService";
import {Badge} from "../common/Badge";
import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";

class Members extends AbstractComponent {
    static propTypes = {
        groupSubjects: PropTypes.object.isRequired,
        title: PropTypes.string,
        onMemberDeletion: PropTypes.func.isRequired,
        onMemberEdit: PropTypes.func.isRequired,
        onMemberSelection: PropTypes.func.isRequired,
        actions: PropTypes.array.isRequired,
        editAllowed: PropTypes.bool,
        removeAllowed: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
    }

    onPopupEvent(eventName, index, groupSubject) {
        if (eventName !== 'itemSelected') return;
        if (index === 0 && this.props.editAllowed) this.props.onMemberEdit(groupSubject);
        else if (index === 0 && !this.props.editAllowed) this.props.onMemberDeletion(groupSubject);
        else this.props.onMemberDeletion(groupSubject)
    }

    getTextComponent(text, color) {
        return <Text style={[Fonts.typography("paperFontBody2"), {color}]}>{text}</Text>
    }

    renderGroupMember(memberSubject) {
        const component = this.getTextComponent(memberSubject.name, Colors.Complimentary);
        const undoneProgramVisits = this.getService(ProgramEncounterService).getAllDueForSubject(memberSubject.uuid).length;
        return <Badge number={undoneProgramVisits} component={component}/>
    }

    renderEnrolledPrograms(memberSubject) {
        const nonExitedEnrolledPrograms = this.getService(ProgramEnrolmentService).getAllNonExitedEnrolmentsForSubject(memberSubject.uuid);
        return _.map(nonExitedEnrolledPrograms, enl => this.getTextComponent(this.I18n.t(enl.program.operationalProgramName || enl.program.name), Colors.InputNormal))
    }

    renderRow(groupSubject) {
        return (
            <View style={[styles.container, {alignItems: 'center'}]}>
                <TouchableOpacity onPress={() => this.props.onMemberSelection(groupSubject.memberSubject.uuid)}
                                  style={{flex: 1, alignSelf: 'center',}}>
                    {this.renderGroupMember(groupSubject.memberSubject)}
                </TouchableOpacity>
                <View style={{flex: 0.8}}>
                    {this.renderEnrolledPrograms(groupSubject.memberSubject)}
                </View>
                <View style={{flex: 0.5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
                    <PopupMenu actions={this.props.actions}
                               onPress={(eventName, index) => this.onPopupEvent(eventName, index, groupSubject)}
                               iconSize={24}/>
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
                renderRow={(groupSubject) => this.renderRow(groupSubject)}
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
