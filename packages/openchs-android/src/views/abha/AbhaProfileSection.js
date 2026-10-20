import React from "react";
import {Text, View} from "react-native";
import PropTypes from "prop-types";
import _ from "lodash";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ObservationsSectionTitle from "../common/ObservationsSectionTitle";
import Styles from "../primitives/Styles";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import AbhaProfile, {ABHA_CONCEPT_NAMES} from "./AbhaProfile";

// A person's ABHA on their profile: a title with its actions, then two read-only lines. Linked means the patient
// has an ABHA Number or an ABHA Address answer (a patient linked through the mobile route has only the address).
// The number is shown masked, and neither value is ever logged.
class AbhaProfileSection extends AbstractComponent {
    static propTypes = {
        section: PropTypes.object.isRequired,
        contextActions: PropTypes.array.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    // Null when nothing is to be shown: ABHA off for the organisation, no health centre for the user, a subject
    // that is not a person, or a voided one.
    static stateFor(individual, {enabled, hipId}) {
        if (!enabled || _.isEmpty(hipId) || !individual.isPerson() || individual.voided) return null;
        const number = individual.getObservationValue(ABHA_CONCEPT_NAMES.abhaNumber);
        const address = individual.getObservationValue(ABHA_CONCEPT_NAMES.abhaAddress);
        const maskedNumber = AbhaProfile.maskAbhaNumber(number);
        return {linked: !_.isEmpty(_.toString(number)) || !_.isEmpty(_.toString(address)), maskedNumber, address: _.toString(address) || null};
    }

    renderLine(labelKey, value) {
        return (
            <Text style={{fontSize: Fonts.Medium, color: Colors.InputNormal, marginVertical: 2}}>
                {`${this.I18n.t(labelKey)}: ${value}`}
            </Text>
        );
    }

    render() {
        const {section, contextActions} = this.props;
        return (
            <View style={{marginTop: 20}}>
                <View style={{paddingLeft: 10}}>
                    <ObservationsSectionTitle contextActions={contextActions} title={this.I18n.t('abhaSectionTitle')}
                                              titleStyle={Styles.dashboardSubsectionTitleText}/>
                </View>
                <View style={{paddingHorizontal: 10}}>
                    <Text style={{fontSize: Fonts.Medium, color: Colors.DefaultPrimaryColor}}>
                        {this.I18n.t(section.linked ? 'abhaLinked' : 'abhaNotLinked')}
                    </Text>
                    {section.maskedNumber && this.renderLine('abhaNumberLabel', section.maskedNumber)}
                    {section.address && this.renderLine('abhaAddressLabel', section.address)}
                </View>
            </View>
        );
    }
}

export default AbhaProfileSection;
