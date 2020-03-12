import TypedTransition from "../../framework/routing/TypedTransition";
import {View, TouchableNativeFeedback, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import {ProgramEnrolmentDashboardActionsNames} from "../../action/program/ProgramEnrolmentDashboardActions";
import GrowthChartView from "./GrowthChartView";
import * as _ from "lodash";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import {Privilege} from "avni-models";
import PrivilegeService from "../../service/PrivilegeService";

@Path('/ProgramActionsView')
class ProgramActionsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, "something");
        this.goToView = this.goToView.bind(this);
        this.privilegeService = context.getService(PrivilegeService);
    }

    static propTypes = {
        programDashboardButtons: PropTypes.array.isRequired,
        enrolment: PropTypes.object.isRequired,
        allowedEncounterTypeUuids: PropTypes.array.isRequired
    };

    startProgramEncounter(allowedEncounterTypeUuids) {
        CHSNavigator.navigateToStartEncounterPage(this, this.props.enrolment.uuid, allowedEncounterTypeUuids);
    }

    openChecklist() {
        CHSNavigator.navigateToChecklistView(this, this.props.enrolment.uuid);
    }

    goToView(button) {
        TypedTransition.from(this).bookmark().with({
            data: _.get(button, ['openOnClick', 'data'])(this.props.enrolment),
            enrolment: this.props.enrolment
        }).to(GrowthChartView);
    }

    renderButton(onPress, buttonStyle, text, textColor, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={buttonStyle}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor
                    }}>{text}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    render() {
        const checklistPredicate = this.props.enrolment.hasChecklist &&
            this.props.enrolment.checklists.map(checklist => `checklistDetailUuid = '${checklist.detail.uuid}'`).join(' OR ');

        const viewChecklistCriteria = this.props.enrolment.program && this.props.enrolment.hasChecklist && `privilege.name = '${Privilege.privilegeName.viewChecklist}' AND privilege.entityType = '${Privilege.privilegeEntityType.checklist}' AND subjectTypeUuid = '${this.props.enrolment.individual.subjectType.uuid}' AND ${checklistPredicate}` || '';
        const allowedChecklistTypeUuids = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewChecklistCriteria, 'checklistDetailUuid');
        return (
            <View
                style={{flex: 1, flexDirection: 'column', marginTop: 8}}>
                {this.props.enrolment.isActive && !_.isEmpty(this.props.allowedEncounterTypeUuids) ?
                    this.renderButton(() => this.startProgramEncounter(this.props.allowedEncounterTypeUuids), Styles.basicPrimaryButtonView,
                        this.I18n.t('newProgramVisit'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {this.props.enrolment.hasChecklist && (!this.privilegeService.hasGroupPrivileges() || !_.isEmpty(allowedChecklistTypeUuids)) ?
                    this.renderButton(() => this.openChecklist(), Styles.basicPrimaryButtonView,
                        this.I18n.t('vaccinations'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {_.map(this.props.programDashboardButtons, (button, index) => this.renderButton(() => this.goToView(button),
                    Styles.basicPrimaryButtonView, this.I18n.t(button.label), Colors.TextOnPrimaryColor, index))}
            </View>
        );
    }
}

export default ProgramActionsView;
