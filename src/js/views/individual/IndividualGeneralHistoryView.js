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
        this.dispatchAction(Actions.LOAD_HISTORY, this.props.params.individual);
        return super.componentWillMount();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('generalConsultation')}/>
                    <IndividualProfile landingView={false} individual={this.props.params.individual}/>
                    {this.state.encounters.map((encounter) => {
                        return (<Observations observations={encounter.observations}/>);
                    })}
                </Content>
            </Container>
        );
    }
}

export default IndividualGeneralHistoryView;