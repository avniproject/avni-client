import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, TextInput, TouchableOpacity, View, Text} from "react-native";
import ValidationErrorMessage from "../ValidationErrorMessage";
import GroupSubjectService from "../../../service/GroupSubjectService";
import _ from 'lodash';
import Colors from "../../primitives/Colors";
import {Concept} from 'openchs-models';
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import SubjectInfoCard from "../../common/SubjectInfoCard";
import Separator from "../../primitives/Separator";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AttendanceFormElementHelper from "./AttendanceFormElementHelper";
import AnyChip from "../../primitives/AnyChip";

class AttendanceFormElement extends AbstractFormElement {
    constructor(props, context) {
        super(props, context);
        this.state = {searchText: '', isSortDescending: false};
    }

    getGroupsSubjects() {
        const subjectTypeUUID = _.get(this.props, 'element.concept').recordValueByKey(Concept.keys.subjectTypeUUID);
        const members = this.getService(GroupSubjectService).getAllByGroupSubjectUUID(this.props.subjectUUID, subjectTypeUUID).map(_.identity);
        const applicableMembers = members.filter(({memberSubject}) => this.props.element.isApplicableSubjectUUID(memberSubject.uuid));
        return AttendanceFormElementHelper.sortByName(applicableMembers, this.state.isSortDescending);
    }

    renderSearchBox() {
        const {searchText} = this.state;
        return (
            <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color={Colors.SecondaryText} style={{marginRight: 8}}/>
                <TextInput style={styles.searchInput}
                           placeholder={this.I18n.t('searchByTyping')}
                           placeholderTextColor={Colors.SecondaryText}
                           underlineColorAndroid="transparent"
                           value={searchText}
                           onChangeText={(text) => this.setState({searchText: text})}/>
                {searchText.length > 0 &&
                    <TouchableOpacity onPress={() => this.setState({searchText: ''})}>
                        <Icon name="close-circle" size={20} color={Colors.SecondaryText}/>
                    </TouchableOpacity>}
            </View>
        );
    }

    renderSortToggle() {
        const {isSortDescending} = this.state;
        const label = isSortDescending ? 'Z–A' : 'A–Z';
        return (
            <TouchableOpacity onPress={() => this.setState({isSortDescending: !isSortDescending})} accessibilityLabel={label}>
                <View style={styles.sortChip}>
                    <Icon name={isSortDescending ? 'sort-alphabetical-descending' : 'sort-alphabetical-ascending'}
                          size={18} color={Colors.ActionButtonColor} style={{marginRight: 4}}/>
                    <Text style={styles.sortChipText}>{label}</Text>
                </View>
            </TouchableOpacity>
        );
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
        return (<TouchableOpacity key={memberSubject.uuid} style={isChecked && styles.memberSelected} onPress={onPress}>
            <View style={styles.memberContainer}>
                <View style={{flex: .8}}>
                    <SubjectInfoCard individual={memberSubject}/>
                </View>
                <View style={{flex: .2, alignItems: 'flex-end', marginRight: 15}}>
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                        {isChecked && <Icon name="check" size={18} color={Colors.TextOnPrimaryColor}/>}
                    </View>
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
        const visibleGroupsSubjects = AttendanceFormElementHelper.matchingName(groupsSubjects, this.state.searchText);
        const subjectUUIDs = _.get(this.props.value, 'answer') || [];
        const selected = groupSize === _.size(subjectUUIDs);
        const selectAllLabel = selected ? this.I18n.t("unselectAllLabel") : this.I18n.t("selectAllLabel");
        const isSelectAllShown = groupSize > 0 && this.props.element.isMultiSelect();

        return (
            <Fragment>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.renderSearchBox()}
                {groupSize > 0 &&
                    <View style={styles.toolbar}>
                        {this.renderSortToggle()}
                        {isSelectAllShown &&
                            <AnyChip label={selectAllLabel} active={selected}
                                     onPress={() => this.handleSelectPress(groupsSubjects, subjectUUIDs, selected)}/>}
                    </View>}
                { _.map(visibleGroupsSubjects, (groupSubject, index) =>
                    this.renderSubject(groupSubject, subjectUUIDs)
                )}
                {groupSize > 0 && _.isEmpty(visibleGroupsSubjects) &&
                    <Text style={styles.noResultText}>{this.I18n.t('zeroNumberOfResults')}</Text>}
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
    },
    memberSelected: {
        backgroundColor: '#E0F2F1',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.InputBorderNormal,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.WhiteContentBackground,
    },
    checkboxChecked: {
        backgroundColor: Colors.ActionButtonColor,
        borderColor: Colors.ActionButtonColor,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sortChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.ActionButtonColor,
        backgroundColor: Colors.FilterButtonColor,
    },
    sortChipText: {
        color: Colors.ActionButtonColor,
        fontSize: 14,
        lineHeight: 18,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginVertical: 6,
        backgroundColor: Colors.cardBackgroundColor,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 6,
        color: Colors.InputNormal,
    },
    noResultText: {
        padding: 12,
        textAlign: 'center',
        color: Colors.SecondaryText,
    }
});
