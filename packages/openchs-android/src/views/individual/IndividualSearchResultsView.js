import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, TouchableNativeFeedback, View} from "react-native";
import ListView from "deprecated-react-native-listview";
import PropTypes from 'prop-types';
import React from "react";
import Path from "../../framework/routing/Path";
import GlobalStyles from "../primitives/GlobalStyles";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Styles from "../primitives/Styles";
import SearchResultsHeader from "./SearchResultsHeader";
import IndividualDetailsCard from "../common/IndividualDetailsCard";
import {IndividualSearchActionNames as Actions} from "../../action/individual/IndividualSearchActions";
import {Individual} from "openchs-models";
import ListViewHelper from "../../utility/ListViewHelper";
import ZeroResults from "../common/ZeroResults";

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

    renderRow(item, onResultRowPress) {
        return <TouchableNativeFeedback onPress={() => onResultRowPress(item)}
                                        background={TouchableNativeFeedback.SelectableBackground()}>
            <View>
                <IndividualDetailsCard individual={new Individual(item)}/>
            </View>
        </TouchableNativeFeedback>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const dataSource = ListViewHelper.getDataSource(this.props.searchResults);
        const title = this.props.headerTitle || "searchResults";

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)}/>
                <SearchResultsHeader totalCount={this.props.totalSearchResultsCount}
                                     displayedCount={this.props.searchResults.length}/>
                    <ListView enableEmptySections={true}
                              dataSource={dataSource}
                              style={{marginBottom: 16}}
                              renderRow={(item) => this.renderRow(item, this.onResultRowPress.bind(this))}/>
                    <ZeroResults count={this.props.searchResults.length}/>
            </CHSContainer>
        );
    }

    onResultRowPress(individual) {
        this.props.onIndividualSelection(this, individual);
        // CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
    }
}

export default IndividualSearchResultsView;
