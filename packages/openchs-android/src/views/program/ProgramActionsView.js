import TypedTransition from "../../framework/routing/TypedTransition";
import {View, TouchableNativeFeedback, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import GrowthChartView from "./GrowthChartView";
import _ from "lodash";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import {Privilege, EncounterType} from "avni-models";
import PrivilegeService from "../../service/PrivilegeService";
import {StartProgramActions as Actions} from "../../action/program/StartProgramActions";
import deferPastInteractions from "../../utility/deferPastInteractions";
import Pressable from "react-native/Libraries/Components/Pressable/Pressable";

@Path('/ProgramActionsView')
class ProgramActionsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.startProgramActions);
        this.privilegeService = context.getService(PrivilegeService);
    }

    // Deferred, not done in willMount: onLoad runs an eligibility rule per encounter type (~1.5s on
    // large orgs) and would starve the JS-thread-driven navigation slide into the subject dashboard.
    // forceUpdate because shouldComponentUpdate below rejects the store update that lands with it.
    onViewDidMount() {
        deferPastInteractions(() => {
            if (this._isUnmounted) return;
            this.dispatchOnLoad();
            this.forceUpdate();
        });
    }

    dispatchOnLoad() {
        const {allowedEncounterTypeUuids, enrolment} = this.props;
        this.loadedEnrolmentUUID = enrolment.uuid;
        this.dispatchAction(Actions.onLoad, {enrolmentUUID: enrolment.uuid, allowedEncounterTypeUuids});
    }

    shouldComponentUpdate(nextProps, state) {
        const enrolment = this.state.enrolment;
        return (!_.isNil(enrolment) && _.get(nextProps, 'enrolment.uuid') !== enrolment.uuid)
            || !_.isEqual(nextProps.programDashboardButtons,  this.props.programDashboardButtons);
    }

    // Guarded on the enrolment: the forceUpdate that clears the deferred load also lands here, and
    // re-dispatching would run the whole eligibility pass a second time.
    componentDidUpdate() {
        if (this.props.enrolment.uuid !== this.loadedEnrolmentUUID) this.dispatchOnLoad();
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

    openGrowthChart(button) {
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

    renderNormalButton() {
        return this.renderButton(() => this.startProgramEncounter(this.props.allowedEncounterTypeUuids), Styles.basicPrimaryButtonView,
            this.I18n.t('newProgramVisit'), Colors.TextOnPrimaryColor)
    }

    renderSingleEncounter() {
        const firstAllowed = _.head(this.state.allAllowed);
        const encounterOrType = firstAllowed.encounter || firstAllowed.encounterType;
        const name = encounterOrType instanceof EncounterType ? encounterOrType.operationalEncounterTypeName : encounterOrType.name;
        return this.renderButton(() => CHSNavigator.proceedEncounter(encounterOrType, firstAllowed.parent, null, this),
            Styles.basicPrimaryButtonView,
            this.I18n.t(name),
            Colors.TextOnPrimaryColor
        );
    }

    renderOption() {
        return this.state.isSingle ? this.renderSingleEncounter() : this.renderNormalButton()
    }

    render() {
        const checklistPredicate = this.props.enrolment.hasChecklist &&
            this.props.enrolment.checklists.map(checklist => `checklistDetailUuid = '${checklist.detail.uuid}'`).join(' OR ');

        const viewChecklistCriteria = this.props.enrolment.program && this.props.enrolment.hasChecklist && `privilege.name = '${Privilege.privilegeName.editChecklist}' AND privilege.entityType = '${Privilege.privilegeEntityType.checklist}' AND subjectTypeUuid = '${this.props.enrolment.individual.subjectType.uuid}' AND ${checklistPredicate}` || '';
        const allowedChecklistTypeUuids = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewChecklistCriteria, 'checklistDetailUuid');
        return (
            <View
                style={{flex: 1, flexDirection: 'column', marginTop: 8}}>
                {this.props.enrolment.isActive && (_.size(this.state.allAllowed) > 0) ? this.renderOption() : <View/>}
                {this.props.enrolment.hasChecklist && (this.privilegeService.hasAllPrivileges() || !_.isEmpty(allowedChecklistTypeUuids)) ?
                    this.renderButton(() => this.openChecklist(), Styles.basicPrimaryButtonView,
                        this.I18n.t('vaccinations'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {_.map(this.props.programDashboardButtons, (button, index) => this.renderButton(() => this.openGrowthChart(button),
                    Styles.basicPrimaryButtonView, this.I18n.t(button.label), Colors.TextOnPrimaryColor, index))}
            </View>
        );
    }
}

export default ProgramActionsView;
