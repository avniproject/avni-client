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
import Fonts from '../primitives/Fonts';
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.any.isRequired,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        if (encounter.getName() === 'Encounter')
            CHSNavigator.navigateToIndividualEncounterLandingView(this, null, encounter);
        else
            CHSNavigator.navigateToProgramEncounterView(this, encounter);
    }

    render() {
        return (
            <View>
                {this.props.encounters.length === 0 ?
                    (<View>
                        <View style={[DGS.common.content]}>
                            <Grid>
                                <Row style={{justifyContent: 'center'}}>
                                    <Text style={{fontSize: Fonts.Large}}>{this.I18n.t('noEncounters')}</Text>
                                </Row>
                            </Grid>
                        </View>
                    </View>)
                    : this.props.encounters.map((encounter, index) => {
                        return (
                            <View key={`${index}-1`} style={this.props.style}>
                                <ObservationsSectionTitle
                                    contextActions={[new ContextAction('edit', () => this.editEncounter(encounter))]}
                                    title={this.I18n.t('visitDetails')}/>
                                <View style={{backgroundColor: Colors.GreyContentBackground}} key={`${index}-2`}>
                                    <View style={DGS.common.content}>
                                        <View style={{flexDirection: 'row'}}>
                                            <Text style={Fonts.LargeBold}>{this.I18n.t('date')}</Text>
                                            <Text style={{fontSize: Fonts.Large, marginLeft: DGS.resizeWidth(10)}}>{moment(encounter.encounterDateTime).format('DD-MM-YYYY')}</Text>
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