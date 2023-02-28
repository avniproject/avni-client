import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Text, View} from "react-native";
import RadioLabelValue from "../primitives/RadioLabelValue";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import DatePicker from "../primitives/DatePicker";
import {AddNewMemberActions as Actions} from "../../action/groupSubject/MemberAction";
import _ from "lodash";
import Reducers from "../../reducer";
import {IndividualRelative} from 'avni-models';
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";


class AddMemberDetails extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    toggleRole(groupRoleUUID) {
        const selectedRole = _.find(this.state.groupRoles, groupRole => groupRole.uuid === groupRoleUUID);
        return this.dispatchAction(Actions.ON_ROLE_SELECT, {value: selectedRole});
    }

    renderRoles() {
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const valueLabelPairs = this.state.groupRoles.map(({uuid, role}) => new RadioLabelValue(role, uuid));
        return (
            <SelectableItemGroup
                allowRadioUnselect={true}
                style={this.props.style}
                inPairs={true}
                onPress={(value) => this.toggleRole(value)}
                selectionFn={(groupRoleUUID) => this.state.member.groupRole.uuid === groupRoleUUID}
                labelKey={this.I18n.t('Role')}
                mandatory={true}
                I18n={this.I18n}
                locale={locale}
                labelValuePairs={valueLabelPairs}
                validationError={AbstractDataEntryState.getValidationError(this.state, 'ROLE')}
            />
        );
    }

    toggleRelation(relationUUID) {
        const selectedRelation = this.state.relations.find((relation) => relation.uuid === relationUUID);
        return this.dispatchAction(Actions.ON_RELATION_SELECT, {value: selectedRelation});
    }

    renderRelationOptions() {
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const valueLabelPairs = this.state.relations.map(({uuid, name}) => new RadioLabelValue(name, uuid));
        const headOfHouseholdGroupSubject = this.state.member.groupSubject.getHeadOfHouseholdGroupSubject();
        const headOfHouseholdName = !_.isEmpty(headOfHouseholdGroupSubject) ? headOfHouseholdGroupSubject.memberSubject.name : '';
        return (
            <SelectableItemGroup
                allowRadioUnselect={true}
                style={this.props.style}
                inPairs={true}
                onPress={(value) => this.toggleRelation(value)}
                selectionFn={(relationUUID) => this.state.individualRelative.relation.uuid === relationUUID}
                labelKey={`${this.I18n.t('RelationWithHeadOfHousehold')} (${headOfHouseholdName})`}
                locale={locale}
                I18n={this.I18n}
                labelValuePairs={valueLabelPairs}
                validationError={AbstractDataEntryState.getValidationError(this.state, IndividualRelative.validationKeys.RELATION)}
            />
        );
    }

    renderRelations() {
        return this.state.member.groupRole.isHouseholdMember ? this.renderRelationOptions() : <View/>;
    }

    renderMembershipStartDate() {
        return <View style={{flexDirection: "column", justifyContent: "flex-start", marginTop: 10}}>
            <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("membershipStartDate")}<Text
                style={{color: Colors.ValidationError}}> * </Text></Text>
            <DatePicker
                actionName={Actions.ON_MEMBERSHIP_START_DATE_SELECT}
                actionObject={this.state.member.membershipStartDate}
                pickTime={false}
                dateValue={this.state.member.membershipStartDate.value}
                validationResult={AbstractDataEntryState.getValidationError(this.state, 'MEMBERSHIP_START_DATE')}
            />
        </View>
    }

    render() {
        return (
            <View>
                {this.state.member.groupSubject.isHousehold() ? this.renderRelations() : this.renderRoles()}
                {this.renderMembershipStartDate()}
            </View>
        );
    }
}

export default AddMemberDetails;
