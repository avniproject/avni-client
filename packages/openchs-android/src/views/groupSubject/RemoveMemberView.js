import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import React from "react";
import PropTypes from "prop-types";
import Styles from "../primitives/Styles";
import {Text, View} from "react-native";
import WizardButtons from "../common/WizardButtons";
import CHSNavigator from "../../utility/CHSNavigator";
import Reducers from "../../reducer";
import {AddNewMemberActions as Actions} from "../../action/groupSubject/MemberAction";
import Colors from "../primitives/Colors";
import DatePicker from "../primitives/DatePicker";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";
import Distances from "../primitives/Distances";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import ConceptService from "../../service/ConceptService";
import UserInfoService from "../../service/UserInfoService";
import {SubjectType} from "avni-models";
import _ from "lodash";

@Path('/removeMemberView')
class RemoveMemberView extends AbstractComponent {

    static propTypes = {
        groupSubject: PropTypes.object,
        goToMemberDashboard: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    viewName() {
        return 'RemoveMemberView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    previous() {
        CHSNavigator.goBack(this);
    }

    removeMember() {
        const member = this.state.member;
        const goToMemberDashboard = this.props.params.goToMemberDashboard;
        const individualUUID = goToMemberDashboard ? member.memberSubject.uuid : member.groupSubject.uuid;
        const tab = goToMemberDashboard ? 2 : 1;
        this.dispatchAction(Actions.ON_DELETE_MEMBER, {
            cb: () => TypedTransition.from(this).resetStack([GenericDashboardView, RemoveMemberView],
                [TypedTransition.createRoute(GenericDashboardView, {
                    message: this.I18n.t('memberDeletedMsg'),
                    individualUUID,
                    tab,
                })])
        });
    }

    renderMembershipEndDate() {
        return <View style={{flexDirection: "column", justifyContent: "flex-start", marginTop: 10}}>
            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("membershipEndDate")}<Text
                style={{color: Colors.ValidationError}}> * </Text></Text>
            <DatePicker
                actionName={Actions.ON_MEMBERSHIP_END_DATE_SELECT}
                actionObject={this.state.member.membershipEndDate}
                pickTime={false}
                dateValue={this.state.member.membershipEndDate.value}
                validationResult={AbstractDataEntryState.getValidationError(this.state, 'MEMBERSHIP_END_DATE')}
            />
        </View>
    }

    renderRemovalReason() {
        const groupSubjectType = this.state.member.groupSubject.subjectType;
        if (!groupSubjectType || !_.isFunction(groupSubjectType.getSetting)) return null;
        const parentUuid = groupSubjectType.getSetting(SubjectType.settingKeys.removalReasonConceptUuid);
        if (!parentUuid) return null;

        const parentConcept = this.context.getService(ConceptService).getConceptByUUID(parentUuid);
        if (!parentConcept) return null;

        const labelValuePairs = parentConcept.getAnswers()
            .filter(answer => answer.concept && !answer.concept.voided)
            .map(answer => ({
                label: answer.concept.name,
                value: answer.concept.uuid,
            }));
        const selectedUuid = this.state.member.removalReasonConceptUUID;
        const currentLocale = this.context.getService(UserInfoService).getUserSettings().locale;

        return <View style={{flexDirection: "column", justifyContent: "flex-start", marginTop: 10}}>
            <SelectableItemGroup
                I18n={this.I18n}
                locale={currentLocale}
                mandatory={true}
                onPress={(value) => this.dispatchAction(Actions.ON_REMOVAL_REASON_SELECT, {value})}
                labelValuePairs={labelValuePairs}
                labelKey="removalReason"
                inPairs={true}
                selectionFn={(value) => selectedUuid === value}
                validationError={AbstractDataEntryState.getValidationError(this.state, 'REMOVAL_REASON')}
                style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
            />
        </View>
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('removeMember')}/>
                    <View style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        {this.renderMembershipEndDate()}
                        {this.renderRemovalReason()}
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{
                                           func: () => this.removeMember(),
                                           label: this.I18n.t('remove')
                                       }}
                                       style={{marginHorizontal: 24}}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default RemoveMemberView;
