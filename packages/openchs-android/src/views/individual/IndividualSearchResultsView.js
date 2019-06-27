import AbstractComponent from "../../framework/view/AbstractComponent";
import {TouchableNativeFeedback, View, ListView, Dimensions, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import Path from "../../framework/routing/Path";
import GlobalStyles from "../primitives/GlobalStyles";
import {Icon} from "native-base";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import SearchResultsHeader from "./SearchResultsHeader";
import IndividualDetailsCard from "../common/IndividualDetailsCard";
import Distances from "../primitives/Distances";

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: PropTypes.array.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        onIndividualSelection: PropTypes.func.isRequired
    };

    viewName() {
        return 'IndividualSearchResultsView';
    }

    constructor(props, context) {
        super(props, context);
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.state = {
            dataSource: ds.cloneWithRows(['row 1', 'row 2']),
        };
    }

    renderZeroResultsMessageIfNeeded() {
        if (this.props.searchResults.length === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    renderProgram(program, index) {
        return (
            <Text key={index} disabled
                  style={[{
                      height: 22,
                      marginLeft: 4,
                      marginRight: 4,
                      borderRadius: 2,
                      paddingHorizontal: 4,
                      backgroundColor: program.colour,
                      color: Colors.TextOnPrimaryColor,
                  }, Styles.userProfileProgramTitle]}>{this.I18n.t(program.displayName)}</Text>
        );
    }

    background() {
        return TouchableNativeFeedback.SelectableBackground();
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(this.props.searchResults);
        const width = Dimensions.get('window').width;

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t("searchResults")}/>
                <SearchResultsHeader totalCount={this.props.totalSearchResultsCount}
                                     displayedCount={this.props.searchResults.length}/>
                <CHSContent>
                    <ListView enableEmptySections={true}
                              dataSource={dataSource}
                              style={{backgroundColor: Colors.cardBackgroundColor}}
                              renderRow={(item) =>
                                  <TouchableNativeFeedback onPress={() => this.onResultRowPress(item)}
                                                           background={this.background()}>
                                      <View style={{
                                          padding: Distances.ScaledContentDistanceFromEdge,
                                          margin: 4,
                                          elevation: 2,
                                          backgroundColor: Colors.cardBackgroundColor,
                                          marginVertical: 3
                                      }}>
                                          <IndividualDetailsCard individual={item}/>
                                      </View>
                                  </TouchableNativeFeedback>
                              }/>
                    {this.renderZeroResultsMessageIfNeeded()}
                </CHSContent>
            </CHSContainer>
        );
    }

    onResultRowPress(individual) {
        this.props.onIndividualSelection(this, individual);
        // CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
    }
}

export default IndividualSearchResultsView;
