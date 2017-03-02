import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import {Grid, Row, Text} from "native-base";
import AbstractComponent from '../../framework/view/AbstractComponent';
import moment from "moment";
import DGS from '../primitives/DynamicGlobalStyles';
import Observations from '../common/Observations';

class PreviousEncounter extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render(){
        const encounterNumber = 0;
        return (
            <View style={{paddingBottom:20}}>
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
                : this.props.encounters.map((encounter) => {
                    return (
                        <View style={DGS.generalHistory.encounter}>
                            <View style={DGS.common.content}>
                                <Grid>
                                    <Row><Text style={{fontSize: 16}}>{this.I18n.t('date')}</Text></Row>
                                    <Row><Text style={{fontSize: 16}}>{moment(encounter.encounterDateTime).format('DD-MM-YYYY')}</Text></Row>
                                </Grid>
                                <Observations observations={encounter.observations} encounterNumber={encounterNumber}/>
                            </View>
                        </View>
                    );
                })}</View>
        );

    }
}

export default PreviousEncounter;