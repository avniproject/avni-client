import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {SectionList, StyleSheet, Text} from "react-native";
import Distances from "../primitives/Distances";
import Fonts from "../primitives/Fonts";
import _ from "lodash";
import IndividualDetails from "./IndividualDetails";
import React from "react";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import SearchResultsHeader from "../individual/SearchResultsHeader";
import Separator from "../primitives/Separator";
import PropTypes from "prop-types";

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

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    renderHeader = ({section: {title}}) => (
        <Text style={[Fonts.typography("paperFontTitle"), styles.TextHeaderStyle]}>
            {_.isEmpty(title) ? 'Individual List' : title}
        </Text>
    );

    renderItems = (individualWithMetadata) => (
        <IndividualDetails
            individualWithMetadata={individualWithMetadata.item}
            header={individualWithMetadata.section.title}
            backFunction={this.goBack.bind(this)}/>
    );

    render() {
        General.logDebug(this.viewName(), 'render');
        const allUniqueGroups = _.uniqBy(_.map(this.props.results, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(this.props.results, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });

        return (
            <CHSContainer>
                <AppHeader
                    title={`${this.I18n.t(this.props.headerTitle)}`}
                    func={this.props.backFunction}
                    icon={this.props.iconName}
                    iconFunc={this.props.iconFunction}/>
                <SearchResultsHeader
                    totalCount={this.props.totalSearchResultsCount}
                    displayedCount={this.props.results.length}/>
                <SectionList
                    contentContainerStyle={styles.container}
                    sections={data}
                    renderSectionHeader={this.renderHeader}
                    renderItem={this.renderItems}
                    SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                        <Separator style={{alignSelf: 'stretch'}} height={5}/>) : null}
                    keyExtractor={(item, index) => index}
                />
            </CHSContainer>
        );
    }

}

export default IndividualListView;

const styles = StyleSheet.create({
    container: {
        marginRight: Distances.ScaledContentDistanceFromEdge,
        marginLeft: Distances.ScaledContentDistanceFromEdge,
        marginTop: Distances.ScaledContentDistanceFromEdge
    },
    TextHeaderStyle: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: 'normal',
        fontSize: 15,
        paddingTop: 15
    }
});
