import {View, StyleSheet, ListView, ScrollView, Text, TouchableNativeFeedback} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import * as CHSStyles from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import AppHeader from "../primitives/AppHeader";
import Individual from "../../models/Individual";

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
            <View key={`1${rowID}`}>
                <TouchableNativeFeedback onPress={() => this.onResultRowPress(individual)} key={`2${rowID}`}>
                    <View style={CHSStyles.Global.listRow} key={`3${rowID}`}>
                        <Text>{individual.toSummaryString()}</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>);
    }

    renderZeroResultsMessageIfNeeded() {
        if (this.props.params.searchResults.length === 0)
            return (
                <View>
                    <Text
                        style={CHSStyles.Global.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>
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
            <ScrollView style={[CHSStyles.Global.mainSection]}>
                <ListView
                    enableEmptySections={true}
                    dataSource={dsClone}
                    renderRow={(searchResult, sectionID, rowID) => this.renderRowAResult(searchResult, rowID)}
                    renderHeader={() => {
                        return (
                            <View />
                        )
                    }}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => AbstractComponent._renderSeparator(rowID, `S${rowID}`, this.props.params.searchResults.length)}
                />
                {this.renderZeroResultsMessageIfNeeded()}
            </ScrollView>
        </View>);
    }

    onResultRowPress(individual) {

    }
}

export default IndividualSearchResultsView;