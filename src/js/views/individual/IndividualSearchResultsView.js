import {View, StyleSheet, ListView, ScrollView, Text, TouchableNativeFeedback} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import {GlobalStyles} from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import AppHeader from "../primitives/AppHeader";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualSearchResultsView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
    }

    renderRowAResult(individual, rowID) {
        return (
            <TouchableNativeFeedback onPress={() => this.onResultRowPress(individual)} key={`2${rowID}`}>
                <View style={GlobalStyles.listRow} key={`3${rowID}`}>
                    <Text>{individual.toSummaryString()}</Text>
                </View>
            </TouchableNativeFeedback>);
    }

    renderZeroResultsMessageIfNeeded() {
        if (this.props.params.searchResults.length === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(this.props.params.searchResults);

        return (<View style={{flex: 1}}>
            <AppHeader title={this.I18n.t("individualSearchResults")} parent={this}/>
            <View style={[GlobalStyles.mainSection]}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(searchResult, sectionID, rowID) => this.renderRowAResult(searchResult, rowID)}
                    renderHeader={() => <View />}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => {
                        if (rowID === (this.props.params.searchResults.length - 1))
                            return (<View key={`S${rowID}`}/>);
                        return (<Text key={`S${rowID}`} style={GlobalStyles.listRowSeparator}/>)
                    }}
                />
                {this.renderZeroResultsMessageIfNeeded()}
            </View>
        </View>);
    }

    onResultRowPress(individual) {
        TypedTransition.from(this).with({individual: individual}).to(IndividualEncounterView);
    }
}

export default IndividualSearchResultsView;