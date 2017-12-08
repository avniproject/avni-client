import {View} from "react-native";
import React from "react";
import {Grid, Row, Text} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import DGS from "../primitives/DynamicGlobalStyles";
import Observations from "../common/Observations";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import ObservationsSectionTitle from "../common/ObservationsSectionTitle";
import {Encounter} from "openchs-models";
import Fonts from "../primitives/Fonts";
import _ from 'lodash';

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
        const sortedEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.earliestVisitDateTime);
        return (
            <View>
                {sortedEncounters.length === 0 ?
                    (<View>
                        <View style={[DGS.common.content]}>
                            <Grid>
                                <Row style={{justifyContent: 'center'}}>
                                    <Text style={{fontSize: Fonts.Large}}>{this.I18n.t('noEncounters')}</Text>
                                </Row>
                            </Grid>
                        </View>
                    </View>)
                    : sortedEncounters.map((encounter, index) => {
                        const title = this.getTitle(encounter);
                        return (
                            <View key={`${index}-1`} style={this.props.style}>
                                <ObservationsSectionTitle
                                    contextActions={[new ContextAction('edit', () => this.editEncounter(encounter))]}
                                    title={title}/>
                                <Observations observations={encounter.observations} key={`${index}-2`}/>
                            </View>
                        );
                    })}</View>
        );
    }

    getTitle(encounter) {
        if (_.isNil(encounter.encounterDateTime))
            return `${_.isNil(encounter.name) ? encounter.encounterType.name : encounter.name}    ${this.I18n.t('scheduled')}: ${moment(encounter.earliestVisitDateTime).format('DD-MM-YYYY')}`;
        else
            return `${_.isNil(encounter.name) ? encounter.encounterType.name : encounter.name}   ${moment(encounter.encounterDateTime).format('DD-MM-YYYY')}`;
    }
}

export default PreviousEncounters;