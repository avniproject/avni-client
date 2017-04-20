import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Observations from "../common/Observations";
import {Content, Container} from "native-base";
import {IndividualRegistrationDetailsActionsNames as Actions} from '../../action/individual/IndividualRegistrationDetailsActions';

@Path('/IndividualRegistrationDetailView')
class IndividualRegistrationDetailView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'IndividualRegistrationDetailView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegistrationDetails);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    render() {
        console.log('IndividualRegistrationDetailView.render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('viewProfile')}/>
                    <IndividualProfile individual={this.state.individual} viewContext={IndividualProfile.viewContext.Individual}/>
                    <Observations observations={this.state.individual.observations}/>
                </Content>
            </Container>
        );
    }
}

export default IndividualRegistrationDetailView;