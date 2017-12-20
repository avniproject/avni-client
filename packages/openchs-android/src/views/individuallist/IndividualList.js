import React from "react";
import {Text, View, StyleSheet, ListView} from 'react-native';
import _ from 'lodash';
import {Header} from 'native-base';
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
import IndividualDetails from './IndividualDetails';
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import Fonts from "../primitives/Fonts";
import General from "../../utility/General";

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
        },
        header: {
            fontWeight: "500",
            color: Colors.InputNormal,
            marginTop: DynamicGlobalStyles.resizeHeight(16),
            marginBottom: DynamicGlobalStyles.resizeHeight(16)
        }
    });

    componentWillMount() {
        General.logDebug("IndividualList", "Component Will Mount");
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.componentWillMount();
    }

    componentWillUnmount() {
        General.logDebug("IndividualList", "Component Will UnMount");
        this.dispatchAction(Actions.RESET_LIST);
        super.componentWillUnmount();
    }

    render() {
        const dataSource = this.ds.cloneWithRows(this.state.individuals.data);
        const visitType = _.startCase(this.props.params.listType);
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader
                    title={`${this.props.params.address.name} - ${visitType}`}/>
                <CHSContent>
                    <ListView
                        style={IndividualList.styles.container}
                        initialListSize={20}
                        enableEmptySections={true}
                        renderHeader={() => (
                            <Text style={[Fonts.typography("paperFontTitle"), IndividualList.styles.header]}>
                                {`Patients with ${visitType} Visits - ${this.props.params.total}`}
                            </Text>)}
                        removeClippedSubviews={true}
                        dataSource={dataSource}
                        renderRow={(individual) => <IndividualDetails individual={individual}/>}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualList;