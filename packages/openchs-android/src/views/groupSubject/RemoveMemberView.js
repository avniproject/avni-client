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
import {AddNewMemberActions as Actions} from "../../action/groupSubject/AddNewMemberAction";
import Colors from "../primitives/Colors";
import DatePicker from "../primitives/DatePicker";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import TypedTransition from "../../framework/routing/TypedTransition";
import GenericDashboardView from "../program/GenericDashboardView";

@Path('/removeMemberView')
class RemoveMemberView extends AbstractComponent {

    static propTypes = {
        member: PropTypes.object
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    viewName() {
        return 'RemoveMemberView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
    }

    previous() {
        CHSNavigator.goBack(this);
    }

    removeMember() {
        this.dispatchAction(Actions.ON_DELETE_MEMBER, {
            cb: () => TypedTransition.from(this).resetStack([GenericDashboardView, RemoveMemberView],
                [TypedTransition.createRoute(GenericDashboardView, {
                    individualUUID: this.state.member.groupSubject.uuid,
                    message: this.I18n.t('memberDeletedMsg'),
                    tab: 1
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

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('membershipDetails')}/>
                    <View style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        {this.renderMembershipEndDate()}
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
