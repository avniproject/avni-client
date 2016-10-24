import {View, StyleSheet, ListView} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import * as CHSStyles from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualSearchResultsView";
    }

    constructor(props, context) {
        super(props, context);
    }

    renderRowAResult(individual, rowID) {
        return (
            <View key={`1${rowID}`}>
                <TouchableNativeFeedback onPress={() => this.onResultRowPress(individual)} key={`2${rowID}`}>
                    <View style={CHSStyles.Global.listRow} key={`3${rowID}`}>
                        {`${individual.name}, Age: ${Individual.getAge(individual)}, ${individual.gender}`}
                    </View>
                </TouchableNativeFeedback>
            </View>);
    }

    renderZeroResultsMessageIfNeeded() {
        if (this.props.searchResults.length === 0)
            return (
                <View>
                    <Text
                        style={CHSStyles.Global.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>
                    {AbstractComponent._renderSeparator(0)}
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();

        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(this.props.searchResults);

        return (<View style={{flex: 1}}>
                    <AppHeader title={I18n.t("individualSearchResults")} parent={this}/>
                    <ScrollView style={[CHSStyles.Global.mainSection]}>
                        <View key={1} style={CHSStyles.Global.listViewContainer}>
                            <ListView
                                enableEmptySections={true}
                                dataSource={dsClone}
                                renderRow={(searchResult, sectionID, rowID) => this.renderRowAResult(searchResult, rowID)}
                                renderHeader={() => {
                                    return (
                                        <View />
                                    )
                                }}
                                renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => AbstractComponent._renderSeparator(rowID, `S${rowID}`, this.props.searchResults.length)}
                            />
                            {this.renderZeroResultsMessageIfNeeded()}
                        </View>
                    </ScrollView>
        </View>);
    }

    onResultRowPress(individual) {

    }
}

export default IndividualSearchResultsView;