import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import {Grid, Row, Text} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import DGS from "../primitives/DynamicGlobalStyles";
import Observations from "../common/Observations";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Encounter from "../../models/Encounter";

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.any.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        if (encounter.constructor.name === Encounter.name)
            CHSNavigator.navigateToIndividualEncounterLandingView(this, null, encounter);
        else
            CHSNavigator.navigateToProgramEncounterView(this, encounter);
    }

    render() {
        return (
            <View style={{paddingBottom: 20}}>
                {this.props.encounters.length === 0 ?
                    (<View style={DGS.generalHistory.encounter}>
                        <View style={[DGS.common.content]}>
                            <Grid>
                                <Row style={{justifyContent: 'center'}}>
                                    <Text style={{fontSize: 16}}>{this.I18n.t('noEncounters')}</Text>
                                </Row>
                            </Grid>
                        </View>
                    </View>)
                    : this.props.encounters.map((encounter, index) => {
                        return (
                            <View key={`${index}-1`}>
                                <ObservationsSectionTitle contextActions={[new ContextAction('edit', () => this.editEncounter(encounter))]} titleKey='visitDetails'/>
                                <View style={DGS.generalHistory.encounter} key={`${index}-2`}>
                                    <View style={DGS.common.content}>
                                        <View style={{flexDirection: 'row'}}>
                                            <Text style={{fontSize: 16}}>{this.I18n.t('date')}</Text>
                                            <Text style={{fontSize: 16}}>{moment(encounter.encounterDateTime).format('DD-MM-YYYY')}</Text>
                                        </View>
                                        <Observations observations={encounter.observations}/>
                                    </View>
                                </View>
                            </View>
                        );
                    })}</View>
        );
    }
}

export default PreviousEncounters;