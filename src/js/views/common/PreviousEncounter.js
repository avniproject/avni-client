import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import {Grid, Row, Text} from "native-base";
import AbstractComponent from '../../framework/view/AbstractComponent';
import moment from "moment";
import DGS from '../primitives/DynamicGlobalStyles';
import Observations from '../common/Observations';
import ContextActionButton from '../primitives/ContextActionButton';
import CHSNavigator from '../../utility/CHSNavigator';

class PreviousEncounter extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        CHSNavigator.navigateToIndividualEncounterLandingView(this, null, encounter.uuid);
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
                : this.props.encounters.map((encounter, index) => {
                    return (
                        <View style={DGS.generalHistory.encounter} key={`${index}`}>
                            <View style={DGS.common.content}>
                                <View style={{flexDirection: 'row'}}>
                                    <Text style={{fontSize: 16}}>{this.I18n.t('date')}</Text>
                                    <Text style={{fontSize: 16}}>{moment(encounter.encounterDateTime).format('DD-MM-YYYY')}</Text>
                                    <ContextActionButton labelKey={'edit'} onPress={() => this.editEncounter(encounter)}/>
                                </View>
                                <Observations observations={encounter.observations}/>
                            </View>
                        </View>
                    );
                })}</View>
        );
    }
}

export default PreviousEncounter;