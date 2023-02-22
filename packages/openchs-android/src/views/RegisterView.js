import AbstractComponent from "../framework/view/AbstractComponent";
import General from "../utility/General";
import {ScrollView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import CHSContainer from "./common/CHSContainer";
import AppHeader from "./common/AppHeader";
import CHSContent from "./common/CHSContent";
import EntityService from "../service/EntityService";
import {Privilege, SubjectType, WorkList, WorkLists} from "avni-models";
import CHSNavigator from "../utility/CHSNavigator";
import Colors from "./primitives/Colors";
import _ from "lodash";
import Distances from "./primitives/Distances";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Fonts from "./primitives/Fonts";
import FormMappingService from "../service/FormMappingService";
import PrivilegeService from "../service/PrivilegeService";
import GroupSubjectService from "../service/GroupSubjectService";
import UserInfoService from "../service/UserInfoService";
import DraftSubjectService from "../service/draft/DraftSubjectService";
import IndividualDetailsCard from "./common/IndividualDetailsCard";
import TypedTransition from "../framework/routing/TypedTransition";
import SubjectRegisterView from "./subject/SubjectRegisterView";
import PersonRegisterView from "./individual/PersonRegisterView";
import SubjectTypeIcon from "./common/SubjectTypeIcon";
import Separator from "./primitives/Separator";
import PropTypes from "prop-types";

class RegisterView extends AbstractComponent {
    static propTypes = {
        hideBackButton: PropTypes.bool.isRequired,
        defaultObservations: PropTypes.any,
        taskUuid: PropTypes.string
    }

    constructor(props, context) {
        super(props, context);
        this.userSettings = context.getService(UserInfoService).getUserSettings();
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    _addRegistrationAction(subjectType) {
        if (subjectType.isHousehold()) {
            return this._addHouseholdAction(subjectType);
        }
        return {
            fn: () => CHSNavigator.navigateToRegisterView(this,
                {taskUuid: this.props.taskUuid,
                    workLists: new WorkLists(new WorkList(this.I18n.t(`${subjectType.name}`)).withRegistration(subjectType.name))}),
            label: this.I18n.t(`${subjectType.name}`),
            backgroundColor: Colors.AccentColor,
        }
    }

    _addHouseholdAction(subjectType) {
        const groupRole = this.getService(GroupSubjectService).getGroupRoles(subjectType)[0];

        const householdParams = {
            subjectTypeName: _.get(groupRole, 'memberSubjectType.name'),
            saveAndProceedLabel: 'registerHeadOfFamily',
            headOfHousehold: true
        };

        return {
            fn: () => CHSNavigator.navigateToRegisterView(this,
                {
                    taskUuid: this.props.taskUuid,
                    workLists: new WorkLists(new WorkList(this.I18n.t(`${subjectType.name}`))
                        .withRegistration(subjectType.name)
                        .withHouseholdRegistration(householdParams)
                    )
                }),
            label: this.I18n.t(`${subjectType.name}`),
            backgroundColor: Colors.AccentColor,
        }
    }

    _addProgramAction(subjectType, program) {
        return {
            fn: () => CHSNavigator.navigateToRegisterView(this,
                {
                    workLists: new WorkLists(new WorkList(this.I18n.t(`REG_ENROL_DISPLAY-${program.programSubjectLabel}`))
                        .withRegistration(subjectType.name)
                        .withEnrolment(program.name)
                    )
                }),
            label: this.I18n.t(`REG_ENROL_DISPLAY-${program.programSubjectLabel}`),
            backgroundColor: program.colour,
        }
    }

    _addProgramActions(subjectType, programs) {
        return _.map(programs, program => this._addProgramAction(subjectType, program));
    }

    renderButton(onPress, buttonColor, text, textColor, index, subjectType, totalActions) {
        return (
            <View key={index}>
                <TouchableNativeFeedback onPress={() => {
                    onPress()
                }}>
                    <View style={{
                        marginRight: Distances.ScaledContentDistanceFromEdge,
                        marginLeft: Distances.ScaledContentDistanceFromEdge
                    }}>
                        <View style={[styles.container]}>
                            <SubjectTypeIcon style={{marginLeft: 8}} size={24} subjectType={subjectType}/>
                            <View style={[styles.textContainer]}>
                                <Text
                                    style={[Fonts.typography("paperFontSubhead"), styles.programNameStyle, {color: textColor}]}>{text}</Text>
                            </View>
                            <Icon style={styles.iconStyle} name='chevron-right'/>
                        </View>
                        {index + 1 !== totalActions &&
                            <Separator backgroundColor={Colors.InputBorderNormal} style={{marginHorizontal: 32}}/>
                        }
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }

    renderDraft(subject) {
        const subjectType = subject.subjectType;
        return (
            <TouchableNativeFeedback onPress={() => TypedTransition.from(this).with({
                subjectUUID: subject.uuid,
                individualUUID: subject.uuid,
                isDraftEntity: true,
                workLists: new WorkLists(new WorkList(this.I18n.t(`${subjectType.name}`)).withRegistration(subjectType.name))
            }).to(subjectType.isPerson() ? PersonRegisterView : SubjectRegisterView)}>
                <View>
                    <IndividualDetailsCard individual={subject} renderDraftString/>
                </View>
            </TouchableNativeFeedback>
        )
    }

    renderDrafts() {
        const draftSubjects = this.context.getService(DraftSubjectService).findAll().sorted('updatedOn', true);
        if (draftSubjects.length > 0) {
            return (
                <View style={styles.draftContainerStyle}>
                    <Text style={styles.draftHeaderStyle}>{this.I18n.t('drafts')}</Text>
                    <View style={styles.draftMessageContainer}>
                        <Text style={styles.draftMessageStyle}>{this.I18n.t('draftDeleteMessage')}</Text>
                    </View>
                    {_.map(draftSubjects, draftSubject => this.renderDraft(draftSubject.constructIndividual()))}
                </View>
            )
        }
    }

    render() {
        General.logDebug("RegisterView", "render");
        let actions = [];

        const registerCriteria = `privilege.name = '${Privilege.privilegeName.registerSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const privilegeService = this.context.getService(PrivilegeService);
        const allowedSubjectTypeUuids = privilegeService.allowedEntityTypeUUIDListForCriteria(registerCriteria, 'subjectTypeUuid');
        const subjectTypes = this.context.getService(EntityService).findAllByCriteria('voided = false AND active = true', SubjectType.schema.name)
            .filter(st => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUuids, st.uuid));

        _.sortBy(subjectTypes, ({name}) => this.I18n.t(name)).forEach(subjectType => {
            let formMappingService = this.context.getService(FormMappingService);
            // Sometimes, a register form might not be provided. Register functionality does not work without that.
            if (!formMappingService.findRegistrationForm(subjectType)) {
                return;
            }
            actions = actions.concat({action: this._addRegistrationAction(subjectType), subjectType});
            const enrolCriteria = `privilege.name = '${Privilege.privilegeName.enrolSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${subjectType.uuid}'`;
            const allowedProgramTypeUuids = privilegeService.allowedEntityTypeUUIDListForCriteria(enrolCriteria, 'programUuid');
            const programs = formMappingService.findActiveProgramsForSubjectType(subjectType)
                .filter(p => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedProgramTypeUuids, p.uuid));
            if (this.userSettings.registerEnrol) {
                actions = actions.concat(this._addProgramActions(subjectType, programs).map(action => ({
                    action,
                    subjectType
                })));
            }
        });

        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t("register")} hideBackButton={this.props.hideBackButton} hideIcon={true}/>
                <CHSContent>
                    <ScrollView style={{marginBottom: 110}} keyboardShouldPersistTaps="handled">
                        {_.map(actions, ({action, subjectType}, key) =>
                            this.renderButton(
                                action.fn,
                                action.backgroundColor || Colors.ActionButtonColor,
                                action.label,
                                Colors.InputNormal,
                                key,
                                subjectType,
                                _.size(actions)
                            )
                        )}
                        {this.renderDrafts()}
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default RegisterView

const styles = StyleSheet.create({
    container: {
        minHeight: 72,
        backgroundColor: Colors.cardBackgroundColor,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
    },
    strip: {
        width: 8,
        height: '100%',
        backgroundColor: '#fefefe'
    },
    textContainer: {
        flex: 1,
        paddingVertical: 4,
        padding: Distances.ScaledContentDistanceFromEdge,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    programNameStyle: {
        color: Colors.DefaultPrimaryColor,
        fontWeight: 'normal',
        fontSize: 20,
        alignSelf: 'flex-start',
        textAlignVertical: 'center',
    },
    iconStyle: {
        color: Colors.AccentColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 40
    },
    draftContainerStyle: {
        marginTop: 16,
        marginBottom: 40,
        height: '100%',
        paddingVertical: 24,
    },
    draftMessageContainer: {
        elevation: 2,
        marginTop: 8,
        marginBottom: 4,
        flexWrap: 'wrap',
        minHeight: 20,
        width: '100%',
    },
    draftMessageStyle: {
        textAlign: 'left',
        fontStyle: 'italic',
        marginHorizontal: 12,
    },
    draftHeaderStyle: {
        marginHorizontal: 12,
        fontWeight: 'bold',
        fontSize: 20,
        color: Colors.DefaultPrimaryColor
    }
});
