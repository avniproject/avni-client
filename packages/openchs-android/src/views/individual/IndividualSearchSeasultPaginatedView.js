import AbstractComponent from "../../framework/view/AbstractComponent";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    Text,
    TouchableNativeFeedback,
    TouchableOpacity,
    View
} from "react-native";
import PropTypes from 'prop-types';
import React, {useEffect, useState} from "react";
import Path from "../../framework/routing/Path";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import SearchResultsHeader from "./SearchResultsHeader";
import IndividualDetailsCard from "../common/IndividualDetailsCard";
import GlobalStyles from "../primitives/GlobalStyles";

@Path('/individualSearchResultPaginatedView')
class IndividualSearchResultPaginatedView extends AbstractComponent {
    static propTypes = {
        searchResults: PropTypes.array.isRequired,
        onIndividualSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'IndividualSearchResultPaginatedView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const title = this.props.headerTitle || "searchResults";
        return (
            <PaginatedView
                searchResults={this.props.searchResults}
                onIndividualSelection={this.props.onIndividualSelection}
                title={title}
                currentPage={this}
                I18n={this.I18n}
            />
        );
    }

}

export const PaginatedView = ({searchResults, onIndividualSelection, currentPage, title, I18n}) => {

    const CHUNK_SIZE = 20;
    const totalCount = searchResults.length;
    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState([]);
    const [offset, setOffset] = useState(0);

    useEffect(() => updateDataSource(), []);

    const updateDataSource = () => {
        setLoading(true);
        const start = offset;
        const end = offset + CHUNK_SIZE;
        setDataSource([...dataSource, ...searchResults.slice(start, end > totalCount ? totalCount : end)]);
        setOffset(offset + CHUNK_SIZE);
        setLoading(false);
    };

    const ItemView = ({item}) => {
        return (
            <TouchableNativeFeedback key={item.uuid}
                                     onPress={() => onIndividualSelection(currentPage, item)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={{
                    elevation: 2,
                    backgroundColor: Colors.cardBackgroundColor,
                    marginVertical: 3,
                    paddingBottom: 5,
                }}>
                    <IndividualDetailsCard individual={item}/>
                </View>
            </TouchableNativeFeedback>
        );
    };

    const renderZeroResultsMessageIfNeeded = () => {
        if (totalCount === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{I18n.t('zeroNumberOfResults')}</Text>
                </View>
            );
        else
            return (<View/>);
    };

    const renderFooter = () => {
        return (
            <View style={{
                padding: 10,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
            }}>
                {dataSource.length !== totalCount &&
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={updateDataSource}
                    style={{
                        padding: 10,
                        backgroundColor: Colors.ActionButtonColor,
                        borderRadius: 4,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                    <Text style={{
                        color: 'white',
                        fontSize: 15,
                        textAlign: 'center',
                    }}>Load More</Text>
                    {loading ? (
                        <ActivityIndicator
                            color="white"
                            style={{marginLeft: 8}}/>
                    ) : null}
                </TouchableOpacity>}
            </View>
        );
    };

    return (
        <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
            <AppHeader title={I18n.t(title)}/>
            <SearchResultsHeader totalCount={totalCount} displayedCount={dataSource.length} displayResultCounts={true}/>
            <CHSContent>
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={dataSource}
                        keyExtractor={(item) => item.uuid}
                        enableEmptySections={true}
                        renderItem={ItemView}
                        ListFooterComponent={renderFooter}
                    />
                </SafeAreaView>
                {renderZeroResultsMessageIfNeeded()}
            </CHSContent>
        </CHSContainer>
    );
};


export default IndividualSearchResultPaginatedView
