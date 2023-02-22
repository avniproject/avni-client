import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {SectionList, StyleSheet, Text} from "react-native";
import Fonts from "../primitives/Fonts";
import _ from "lodash";
import IndividualDetails from "./IndividualDetails";
import React from "react";
import General from "../../utility/General";
import AppHeader from "../common/AppHeader";
import SearchResultsHeader from "../individual/SearchResultsHeader";
import Separator from "../primitives/Separator";
import PropTypes from "prop-types";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";

@Path('/IndividualListView')
class IndividualListView extends AbstractComponent {

    static propTypes = {
        results: PropTypes.array.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        headerTitle: PropTypes.string.isRequired,
        indicatorActionName: PropTypes.func,
        backFunction: PropTypes.func,
        iconName: PropTypes.string,
        iconFunction: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "IndividualListView";
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    renderHeader = ({section: {title}}) => (
        _.isEmpty(title) ? null : <Text style={[Fonts.typography("paperFontTitle"), styles.TextHeaderStyle]}>
            {title}
        </Text>
    );

    renderItems = (item, section, listType, cardType) => {
        const individualWithMetadata = listType === 'total' ? {individual: item, visitInfo: {visitName: []}} : item;
        return (
            <IndividualDetails
                individualWithMetadata={individualWithMetadata}
                header={section.title}
                backFunction={this.goBack.bind(this)}
                cardType={cardType}/>
        );
    };

    getDataWithVisitInfo(){
        const allUniqueGroups = _.uniqBy(_.map(this.props.results, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(this.props.results, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });
        return {data, allUniqueGroups};
    }

    getDataForTotal() {
        return {data: [{title: '', data: this.props.results}], allUniqueGroups: ''}
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
                    displayedCount={this.props.results.length}/>
                <SectionList
                    style={{marginBottom: 16}}
                    keyExtractor={(item, index) => item.uuid || item.individual.uuid}
                    sections={data}
                    renderItem={({item, section}) => this.renderItems(item, section, this.props.listType, this.props.headerTitle)}
                    renderSectionHeader={this.renderHeader}
                    SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                        <Separator style={{alignSelf: 'stretch'}} height={5} backgroundColor={Colors.GreyContentBackground}/>) : null}
                    initialNumToRender={15}
                    updateCellsBatchingPeriod={500}
                    maxToRenderPerBatch={30}
                />
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
