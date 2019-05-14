import PropTypes from 'prop-types';
import React from "react";
import {Text, View, StyleSheet, ListView, TouchableOpacity, Modal} from 'react-native';
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
import SearchResultsHeader from "../individual/SearchResultsHeader";
import _ from 'lodash';

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
        },
        filterButton: {
            alignSelf: 'flex-end'
        },
        floatingButton: {
            position: 'absolute',
            width: 60,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            right: 30,
            bottom: 30,
            borderRadius: 150,
            backgroundColor: Colors.AccentColor
        },

        floatingButtonIcon: {
            color: Colors.TextOnPrimaryColor
        }
    });

    onBackCallback() {
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        this.goBack();
    }


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

    _onPress() {
        this.dispatchAction(Actions.ON_FILTERS);
    }

    _onClose() {
        this.dispatchAction(Actions.ON_FILTERS);
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const dataSource = this.ds.cloneWithRows(this.state.individuals.data.slice(0, 50));
        const visitType = this.I18n.t(this.props.params.cardTitle);
        const visitInfo = this.props.params.visitInfo;
        return (
            <CHSContainer  style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader
                    title={`${visitType}`}
                    func={this.props.params.backFunction}/>
                <SearchResultsHeader totalCount={this.state.individuals.data.length}
                                     displayedCount={this.state.individuals.data.slice(0, 50).length}/>
                <CHSContent>
                    <ListView
                        style={IndividualList.styles.container}
                        initialListSize={20}
                        enableEmptySections={true}
                        removeClippedSubviews={true}
                        dataSource={dataSource}
                        renderRow={(individual) => <IndividualDetails individual={individual}
                                                                      visitInfo={_.filter(visitInfo, (visits) => visits.uuid === individual.uuid)}
                                                                      backFunction={() => this.onBackCallback()}/>}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualList;
