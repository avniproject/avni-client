import PropTypes from 'prop-types';
import React from "react";
import {ListView, Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import _ from 'lodash';
import {Header, Icon} from 'native-base';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AddressVisitRow from './AddressVisitRow';
import Distances from '../primitives/Distances'
import Separator from '../primitives/Separator';
import Filters from "../filter/FiltersView";
import AppHeader from "../common/AppHeader";
import DashboardFilters from "./DashboardFilters";

@Path('/MyDashboard')
class MyDashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "MyDashboard";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
        this.ds = new ListView.DataSource({rowHasChanged: () => false});
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge
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

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    onBackCallback() {
        this.dispatchAction(Actions.ON_LOAD);
        this.goBack();
    }

    _onPress() {
        this.dispatchAction(Actions.ON_FILTERS);
    }

    _onClose() {
        this.dispatchAction(Actions.ON_FILTERS);
        this.dispatchAction(Actions.ON_LOAD);
    }

    render() {
        const dataSource = this.ds.cloneWithRows(_.values(this.state.visits));
        const date = this.state.date;
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('myDashboard')} func={this.onBackCallback.bind(this)}/>
                <CHSContent>
                    <Modal
                        animationType={'fade'}
                        transparent={true}
                        visible={this.state.showFilters}
                        onRequestClose={() => this._onClose()}>
                        <Filters
                            applyFn={() => this._onClose()}
                            filters={this.state.filters}
                            onSelect={(filter) => this.dispatchAction(Actions.ADD_FILTER, {filter: filter})}/>
                    </Modal>
                    <View style={MyDashboardView.styles.container}>
                        <DashboardFilters date={date} filters={this.state.filters}/>
                        <ListView dataSource={dataSource}
                                  initialListSize={1}
                                  removeClippedSubviews={true}
                                  renderSeparator={(ig, idx) => (<Separator key={idx} height={2}/>)}
                                  renderRow={(rowData) => <AddressVisitRow address={rowData.address}
                                                                           visits={rowData.visits}
                                                                           backFunction={() => this.onBackCallback()}
                                  />}/>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this._onPress()}
                                  style={MyDashboardView.styles.floatingButton}>
                    <Icon name='filter-list' size={40}
                          style={MyDashboardView.styles.floatingButtonIcon}/>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default MyDashboardView;