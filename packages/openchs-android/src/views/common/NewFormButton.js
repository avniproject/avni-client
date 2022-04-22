import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Reducers from "../../reducer";
import {Text, TouchableNativeFeedback, View} from "react-native";
import Fonts from "../primitives/Fonts";
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import _ from "lodash";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import PrivilegeService from "../../service/PrivilegeService";
import {Privilege} from 'avni-models';

class NewFormButton extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
        this.privilegeService = context.getService(PrivilegeService);
    }

    renderButton(onPress, buttonStyle, text, textColor, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={buttonStyle}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor,
                        paddingHorizontal: 10
                    }}>{text}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(Actions.LAUNCH_ENCOUNTER_SELECTOR);
    }


    render() {
        const performEncounterCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForPerformVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(performEncounterCriteria, 'encounterTypeUuid');
        const style = this.props.style || {};
        return (
            this.props.display ?
                <View style={style}>
                    <View style={{marginTop: 2, position: 'absolute', right: 8}}>
                        {_.isEmpty(this.state.encounterTypes) || (this.privilegeService.hasEverSyncedGroupPrivileges() && !this.privilegeService.hasAllPrivileges() && _.isEmpty(allowedEncounterTypeUuidsForPerformVisit)) ?
                            <View/> :
                            this.renderButton(() => this.startEncounter(), Styles.basicPrimaryButtonView,
                                this.I18n.t('newGeneralVisit'), Colors.TextOnPrimaryColor)
                        }
                    </View>
                </View> :
                null
        )
    }


}

export default NewFormButton
