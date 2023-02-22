import AbstractComponent from "../../framework/view/AbstractComponent";
import {FlatList, TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Component} from "react";
import Path from "../../framework/routing/Path";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import SearchResultsHeader from "./SearchResultsHeader";
import IndividualDetailsCard from "../common/IndividualDetailsCard";
import {IndividualSearchActionNames as Actions} from "../../action/individual/IndividualSearchActions";
import {getUnderlyingRealmCollection, Individual} from "openchs-models";
import ZeroResults from "../common/ZeroResults";

class IndividualSearchResultRow extends Component {
    static propTypes = {
        item: PropTypes.any.isRequired,
        onResultRowPress: PropTypes.func.isRequired
    }

    constructor(props, context) {
        super(props, context);
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        const {item, onResultRowPress} = this.props;
        const individual = new Individual(item);
        General.logDebug("IndividualSearchResultRow", `${individual.name}`);
        return <TouchableNativeFeedback key={individual.uuid} onPress={() => onResultRowPress(individual)}
                                        background={TouchableNativeFeedback.SelectableBackground()}>
            <View>
                <IndividualDetailsCard individual={individual}/>
            </View>
        </TouchableNativeFeedback>;
    }
}

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: PropTypes.any.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        onIndividualSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'IndividualSearchResultsView';
    }

    UNSAFE_componentWillMount() {
        setTimeout(() => this.dispatchAction(Actions.LOAD_INDICATOR, {status: false}), 0);
        super.UNSAFE_componentWillMount();
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const title = this.props.headerTitle || "searchResults";
        const searchResultsCollection = getUnderlyingRealmCollection(this.props.searchResults);

        return (
            <View style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)}/>
                <SearchResultsHeader totalCount={this.props.totalSearchResultsCount}
                                     displayedCount={this.props.searchResults.length}/>
                <FlatList
                    data={searchResultsCollection}
                    keyExtractor={(item) => item.uuid}
                    renderItem={({item}) => <IndividualSearchResultRow item={item} onResultRowPress={this.onResultRowPress.bind(this)}/>}
                />
                <ZeroResults count={this.props.searchResults.length}/>
            </View>
        );
    }

    onResultRowPress(individual) {
        this.props.onIndividualSelection(this, individual);
    }
}

export default IndividualSearchResultsView;
