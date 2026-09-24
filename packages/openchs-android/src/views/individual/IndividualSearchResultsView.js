import AbstractComponent from "../../framework/view/AbstractComponent";
import {FlatList, ToastAndroid, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import Path from "../../framework/routing/Path";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import SearchResultsHeader from "./SearchResultsHeader";
import {IndividualSearchActionNames as Actions} from "../../action/individual/IndividualSearchActions";
import {getUnderlyingRealmCollection, Individual} from "openchs-models";
import ZeroResults from "../common/ZeroResults";
import IndividualSearchResultRow from "./IndividualSearchResultRow";
import resolveSelectedIndividuals from "./resolveSelectedIndividuals";
import FloatingButton from "../primitives/FloatingButton";
import _ from "lodash";

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: PropTypes.any.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        onIndividualSelection: PropTypes.func,
        headerTitle: PropTypes.string,
        multiSelect: PropTypes.bool,
        preSelectedMembers: PropTypes.array,
        onIndividualsSelection: PropTypes.func,
        onSelectionChange: PropTypes.func,
        maxSelectable: PropTypes.number,
        selectionFullMessage: PropTypes.string
    };

    constructor(props, context) {
        super(props, context);
        // No topLevelStateVariable, so AbstractComponent never subscribes to the store and never
        // seeds this.state. Selection is local to this screen and has to be initialised here.
        this.state = {selectedUUIDs: _.map(props.preSelectedMembers, 'uuid')};
    }

    viewName() {
        return 'IndividualSearchResultsView';
    }

    UNSAFE_componentWillMount() {
        setTimeout(() => this.dispatchAction(Actions.LOAD_INDICATOR, {status: false}), 0);
        super.UNSAFE_componentWillMount();
    }

    isSelectionFull() {
        return !_.isNil(this.props.maxSelectable) && this.state.selectedUUIDs.length >= this.props.maxSelectable;
    }

    toggleSelection(individual) {
        const selected = _.includes(this.state.selectedUUIDs, individual.uuid);
        if (!selected && this.isSelectionFull()) {
            // A soft limit on a list the user is scanning - a toast, not a modal to dismiss.
            ToastAndroid.show(this.props.selectionFullMessage, ToastAndroid.SHORT);
            return;
        }
        this.setState(({selectedUUIDs}) => {
            const next = selected ? _.without(selectedUUIDs, individual.uuid)
                : [...selectedUUIDs, individual.uuid];
            // Publish upward: going Back to the filter and searching again mounts a fresh results
            // screen, which would otherwise be seeded from the prop as it was two searches ago.
            if (this.props.onSelectionChange) this.props.onSelectionChange(this.resolve(next));
            return {selectedUUIDs: next};
        });
    }

    resolve(selectedUUIDs) {
        return resolveSelectedIndividuals(selectedUUIDs, this.props.searchResults,
            this.props.preSelectedMembers, item => new Individual(item));
    }

    onDone() {
        this.props.onIndividualsSelection(this, this.resolve(this.state.selectedUUIDs));
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const title = this.props.headerTitle || "searchResults";
        const {multiSelect} = this.props;
        const {selectedUUIDs} = this.state;

        return (
            <View style={{backgroundColor: Colors.GreyContentBackground,flex:1}}>
                <AppHeader title={this.I18n.t(title)}/>
                <SearchResultsHeader totalCount={this.props.totalSearchResultsCount}
                                     displayedCount={this.props.searchResults.length}/>
                <FlatList
                    data={this.props.searchResults}
                    keyExtractor={(item) => item.uuid}
                    extraData={multiSelect ? selectedUUIDs : undefined}
                    renderItem={({item}) => <IndividualSearchResultRow item={item}
                                                                       checked={multiSelect ? _.includes(selectedUUIDs, item.uuid) : undefined}
                                                                       onResultRowPress={this.onResultRowPress.bind(this)}/>}
                />
                <ZeroResults count={this.props.searchResults.length}/>
                {multiSelect && selectedUUIDs.length > 0 &&
                <FloatingButton buttonTextKey="doneWithCount" buttonTextParams={{count: selectedUUIDs.length}}
                                onClick={() => this.onDone()}/>}
            </View>
        );
    }

    onResultRowPress(individual) {
        if (this.props.multiSelect) {
            this.toggleSelection(individual);
        } else {
            this.props.onIndividualSelection(this, individual);
        }
    }
}

export default IndividualSearchResultsView;
