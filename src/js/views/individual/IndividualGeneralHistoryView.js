import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import _ from "lodash";
import {Actions} from '../../action/individual/IndividualGeneralHistoryActions';
import Observations from '../common/Observations';
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import AppHeader from '../common/AppHeader';
import IndividualProfile from '../common/IndividualProfile';
import ReducerKeys from "../../reducer";
import moment from "moment";
import DGS from '../primitives/DynamicGlobalStyles';
import Separator from '../primitives/Separator';

@Path('/IndividualGeneralHistoryView')
class IndividualGeneralHistoryView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualGeneralHistoryView";
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.individualGeneralHistory);
    }

    componentWillMount() {
        this.dispatchAction(Actions.LOAD_HISTORY, {individual: this.props.params.individual});
        return super.componentWillMount();
    }

    render() {
        const encounterNumber = 0;
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('generalHistory')}/>
                    <View>
                        <View style={DGS.common.content}>
                            <IndividualProfile landingView={false} individual={this.props.params.individual}/>
                        </View>
                        {this.state.encounters.length === 0 ?
                            (<View style={DGS.generalHistory.encounter}>
                                <View style={[DGS.common.content]}>
                                    <Grid>
                                        <Row style={{justifyContent: 'center'}}>
                                            <Text style={{fontSize: 16}}>{this.I18n.t('noEncounters')}</Text>
                                        </Row>
                                    </Grid>
                                </View>
                            </View>)
                            : this.state.encounters.map((encounter) => {
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
                            })}
                    </View>
                </Content>
            </Container>
        );
    }
}

export default IndividualGeneralHistoryView;