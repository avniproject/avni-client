import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {ActivityIndicator, InteractionManager, SectionList, StyleSheet, Text} from "react-native";
import _ from "lodash";
import IndividualDetails from "./IndividualDetails";
import React, {Fragment} from "react";
import General from "../../utility/General";
import AppHeader from "../common/AppHeader";
import SearchResultsHeader from "../individual/SearchResultsHeader";
import Separator from "../primitives/Separator";
import PropTypes from "prop-types";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import Styles from '../primitives/Styles';
import {View} from 'native-base';

const BATCH_SIZE = 30;

@Path('/IndividualListView')
class IndividualListView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.array.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        headerTitle: PropTypes.string.isRequired,
        indicatorActionName: PropTypes.string,
        backFunction: PropTypes.func,
        iconName: PropTypes.string,
        iconFunction: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {listReady: false, items: [], loadingMore: false};
        this._isScrolling = false;
    }

    viewName() {
        return "IndividualListView";
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    onViewDidMount() {
        if (this.props.results.length > 0) {
            this._initBatch();
        } else {
            this.setState({listReady: true});
            if (this.props.indicatorActionName) {
                this.dispatchAction(this.props.indicatorActionName, {loading: false});
            }
        }
    }

    componentDidUpdate(prevProps) {
        if (this.state.items.length === 0 && prevProps.results.length === 0 && this.props.results.length > 0) {
            this._initBatch();
        }
    }

    _initBatch() {
        if (this.state.items.length > 0) return;
        const batch = this.sliceBatch(0);
        this.setState({listReady: true, items: batch});
        if (this.props.indicatorActionName) {
            this.dispatchAction(this.props.indicatorActionName, {loading: false});
        }
    }

    sliceBatch(offset) {
        const results = this.props.results;
        const end = Math.min(offset + BATCH_SIZE, results.length);
        const batch = [];
        for (let i = offset; i < end; i++) batch.push(results[i]);
        return batch;
    }

    loadBatch(offset) {
        const batch = this.sliceBatch(offset);
        this.setState(prev => ({items: [...prev.items, ...batch], loadingMore: false}));
    }

    onEndReached = () => {
        if (this.state.loadingMore) return;
        const nextOffset = this.state.items.length;
        if (nextOffset >= this.props.results.length) return;
        this.setState({loadingMore: true}, () => {
            InteractionManager.runAfterInteractions(() => this.loadBatch(nextOffset));
        });
    }

    renderHeader = ({section: {title, data}}) => (_.isEmpty(title) ? null :
      <View style={{display: 'flex', flexDirection: 'row'}}>
          <Text style={{
              fontSize: 12, color: Styles.blackColor
          }}>{`   ${title}`}</Text>
          <Text style={{
              fontSize: 12, color: Styles.lightgrey
          }}>{` ${this.I18n.t("matchingResults")}: ${data.length}`}</Text>
      </View>);

    renderItems = (item, section, listType, cardType) => {
        const individualWithMetadata = listType === 'total' ? {individual: item, visitInfo: {visitName: []}} : item;
        return (
            <IndividualDetails
                individualWithMetadata={individualWithMetadata}
                header={section.title}
                backFunction={this.goBack.bind(this)}
                cardType={cardType}
                isScrolling={() => this._isScrolling}
                onSaveCallback={this.props.onSaveCallback}/>
        );
    };

    getDataWithVisitInfo() {
        const results = this.state.items;
        const allUniqueGroups = _.uniqBy(_.map(results, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(results, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });
        return {data, allUniqueGroups};
    }

    getDataForTotal() {
        return {data: [{title: '', data: this.state.items}], allUniqueGroups: ''};
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const {data, allUniqueGroups} = this.props.listType === 'total' ? this.getDataForTotal() : this.getDataWithVisitInfo();

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader
                    title={`${this.I18n.t(this.props.headerTitle)}`}
                    func={this.props.backFunction}
                    icon={this.props.iconName}
                    iconFunc={this.props.iconFunction}/>
                <SearchResultsHeader
                    totalCount={this.props.totalSearchResultsCount}
                    displayedCount={this.props.totalSearchResultsCount}/>
                {this.state.listReady ? (
                    <SectionList
                        style={{marginBottom: 16, flex: 1}}
                        keyExtractor={(item, index) => item.uuid || item.individual.uuid}
                        sections={data}
                        renderItem={({item, section}) => this.renderItems(item, section, this.props.listType, this.props.headerTitle)}
                        renderSectionHeader={this.renderHeader}
                        SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                            <Separator style={{alignSelf: 'stretch', margin: 6}} height={2} backgroundColor={Colors.GreyBackground}/>) : null}
                        initialNumToRender={10}
                        windowSize={5}
                        updateCellsBatchingPeriod={100}
                        maxToRenderPerBatch={5}
                        onScrollBeginDrag={() => { this._isScrolling = true; }}
                        onScrollEndDrag={() => { setTimeout(() => { this._isScrolling = false; }, 150); }}
                        onMomentumScrollEnd={() => { this._isScrolling = false; }}
                        onEndReached={this.onEndReached}
                        onEndReachedThreshold={0.5}
                    />
                ) : (
                    <ActivityIndicator
                        size="large"
                        color={Colors.DarkPrimaryColor}
                        style={{flex: 1, justifyContent: 'center', alignSelf: 'center'}}
                    />
                )}
            </CHSContainer>
        );
    }

}

export default IndividualListView;

const styles = StyleSheet.create({
    TextHeaderStyle: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: 'normal',
        fontSize: 15,
        paddingTop: 15,
        paddingLeft: Distances.ScaledContentDistanceFromEdge
    }
});
