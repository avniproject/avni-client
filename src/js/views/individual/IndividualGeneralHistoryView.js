import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Actions} from '../../action/individual/IndividualGeneralHistoryActions';
import {Content, Container} from "native-base";
import AppHeader from '../common/AppHeader';
import IndividualProfile from '../common/IndividualProfile';
import ReducerKeys from "../../reducer";
import DGS from '../primitives/DynamicGlobalStyles';
import PreviousEncounter from '../common/PreviousEncounter'
import _ from 'lodash';

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
        this.dispatchAction(Actions.LOAD_HISTORY, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.individual);
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('generalHistory')}/>
                    <View>
                        <View style={DGS.common.content}>
                            <IndividualProfile viewContext={IndividualProfile.viewContext.General} individual={this.state.individual}/>
                        </View>
                        <PreviousEncounter encounters={this.state.individual.encounters}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default IndividualGeneralHistoryView;