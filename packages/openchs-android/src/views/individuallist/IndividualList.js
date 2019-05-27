import PropTypes from 'prop-types';
import React from "react";
import {Text, View, StyleSheet, ListView, TouchableOpacity, Modal, SectionList} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Distances from '../primitives/Distances'
import IndividualDetails from './IndividualDetails';
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import Fonts from "../primitives/Fonts";
import General from "../../utility/General";
import SearchResultsHeader from "../individual/SearchResultsHeader";
import _ from 'lodash';
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";

@Path('/IndividualList')
class IndividualList extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualList";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            marginTop: Distances.ScaledContentDistanceFromEdge
        },
        header: {
            fontWeight: "500",
            color: Colors.InputNormal,
            marginTop: DynamicGlobalStyles.resizeHeight(16),
            marginBottom: DynamicGlobalStyles.resizeHeight(16)
        }
    });

    onBackCallback() {
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        this.goBack();
    }


    componentWillMount() {
        General.logDebug("IndividualList", "Component Will Mount");
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.componentWillMount();
    }

    componentWillUnmount() {
        General.logDebug("IndividualList", "Component Will UnMount");
        this.dispatchAction(Actions.RESET_LIST);
        super.componentWillUnmount();
    }

    _onPress() {
        this.dispatchAction(Actions.ON_FILTERS);
    }

    _onClose() {
        this.dispatchAction(Actions.ON_FILTERS);
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const individualsWithMetadata = _.orderBy(this.state.individuals.data, ({visitInfo}) => visitInfo.sortingBy, 'desc').slice(0, 50);
        const allUniqueGroups = _.uniqBy(_.map(individualsWithMetadata, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(individualsWithMetadata, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });

        const renderHeader = (title) => {
            return <Text style={[Fonts.typography("paperFontTitle"), {
                color: "rgba(0, 0, 0, 0.87)",
                fontWeight: 'normal',
                fontSize: 15,
                paddingTop: 15
            }]}>{_.isEmpty(title) ? 'Individual List' : title}</Text>
        };

        return (
            <CHSContainer>
                <AppHeader
                    title={`${this.I18n.t(this.props.params.cardTitle)}`}
                    func={this.props.params.backFunction}/>
                <SearchResultsHeader totalCount={this.state.individuals.data.length}
                                     displayedCount={individualsWithMetadata.length}/>
                <CHSContent style={{backgroundColor: '#f7f7f7'}}>
                    <SectionList
                        contentContainerStyle={{
                            marginRight: Distances.ScaledContentDistanceFromEdge,
                            marginLeft: Distances.ScaledContentDistanceFromEdge,
                            marginTop: Distances.ScaledContentDistanceFromEdge,
                        }}
                        sections={data}
                        renderSectionHeader={({section: {title}}) => renderHeader(title)}
                        renderItem={(individualWithMetadata) =>
                            <IndividualDetails
                                individualWithMetadata={individualWithMetadata.item}
                                header={individualWithMetadata.section.title}
                                backFunction={() => this.onBackCallback()}/>}
                        SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                            <Separator style={{alignSelf: 'stretch'}} height={5}/>) : null}
                        keyExtractor={(item, index) => item.uuid + index}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualList;
