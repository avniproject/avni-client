import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {Text, View} from "react-native";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import DatePicker from "../primitives/DatePicker";
import {AddNewMemberActions as Actions} from "../../action/groupSubject/AddNewMemberAction";
import _ from "lodash";
import Reducers from "../../reducer";


class AddMemberDetails extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addNewMember);
    }

    toggleRole(groupRoleUUID) {
        const selectedRole = _.find(this.state.groupRoles, groupRole => groupRole.uuid === groupRoleUUID);
        return this.dispatchAction(Actions.ON_ROLE_SELECT, {value: selectedRole});
    }

    renderRoles() {
        const valueLabelPairs = this.state.groupRoles.map(({uuid, role}) => new RadioLabelValue(role, uuid));
        return (
            <RadioGroup
                style={this.props.style}
                inPairs={true}
                onPress={({label, value}) => this.toggleRole(value)}
                selectionFn={(groupRoleUUID) => this.state.member.groupRole.uuid === groupRoleUUID}
                labelKey={this.I18n.t('Role')}
                mandatory={true}
                labelValuePairs={valueLabelPairs}
                validationError={AbstractDataEntryState.getValidationError(this.state, 'ROLE')}
            />
        );
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
                {this.renderRoles()}
                {this.renderMembershipStartDate()}
            </View>
        );
    }
}

export default AddMemberDetails;
