import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import _ from "lodash";
import Actions from '../../action/individual/IndividualGeneralHistoryActions';

@Path('/IndividualGeneralHistoryView')
class IndividualGeneralHistoryView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualGeneralHistoryView";
    }

    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        this.dispatchAction(Actions.LOAD_HISTORY, this.props.params.individual);
        return super.componentWillMount();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: '#212121'}}>
                    <AppHeader title={this.I18n.t('generalConsultation')}/>
                    <IndividualProfile landingView={false} individual={this.props.params.individual}/>
                </Content>
            </Container>
        );
    }
}

export default IndividualGeneralHistoryView;