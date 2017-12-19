import React from "react";
import {Text, View, StyleSheet, ListView} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Distances from '../primitives/Distances'
import Separator from '../primitives/Separator';

@Path('/IndividualList')
class IndividualList extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualList";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge
        }
    });

    componentWillMount() {
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.componentWillMount();
    }

    render() {
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <CHSContent>
                    <AppHeader title={"List of Individuals"}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualList;