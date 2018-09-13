import AbstractComponent from "../../framework/view/AbstractComponent";
import {TouchableNativeFeedback, View, ListView, Dimensions, Text} from "react-native";
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

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: React.PropTypes.array.isRequired,
        onIndividualSelection: React.PropTypes.func.isRequired
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
                        paddingHorizontal:4,
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
        const i18n = this.I18n;
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(this.props.searchResults);
        const width = Dimensions.get('window').width;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent>
                    <AppHeader title={this.I18n.t("searchResults")}/>
                    <ListView enableEmptySections={true}
                              dataSource={dataSource}
                              style={{backgroundColor: Styles.greyBackground}}
                              renderRow={(item) =>
                                  <TouchableNativeFeedback onPress={() => this.onResultRowPress(item)}
                                                           background={this.background()}>
                                      <View>
                                          <View style={{
                                              flexDirection: 'row',
                                              flexWrap: 'nowrap',
                                              alignItems: 'center',
                                              alignSelf: 'center',
                                              height: 86,
                                              paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge
                                          }}>
                                              <Icon name='person-pin' style={{
                                                  color: Colors.AccentColor,
                                                  fontSize: 56,
                                                  paddingRight: 16
                                              }}/>
                                              <View
                                                  style={{flexDirection: 'column', alignItems: 'flex-start', flex: 1}}>
                                                  <Text style={Styles.textStyle}>
                                                      {item.name}
                                                      {item.voided &&
                                                      <Text style={{color: Styles.redColor}}>
                                                          {` ${this.I18n.t("voidedLabel")}`}
                                                      </Text>
                                                      }
                                                  </Text>
                                                  <View style={{
                                                      flexDirection: 'row',
                                                      justifyContent: 'flex-start',
                                                      alignItems: 'flex-start'
                                                  }}>
                                                      <Text
                                                          style={Styles.userProfileSubtext}>{this.I18n.t(item.gender.name)}</Text>
                                                      <Text
                                                          style={Styles.userProfileSubtext}>{item.getDisplayAge(i18n)}</Text>
                                                  </View>
                                              </View>
                                              <View style={{
                                                  flexDirection: 'column',
                                                  justifyContent: 'center',
                                                  alignItems: 'flex-end',
                                                  flex: 1
                                              }}>
                                                  <View style={{justifyContent: 'flex-end'}}>
                                                      <Text
                                                          style={Styles.textStyle}>{this.I18n.t(item.lowestAddressLevel.name)}</Text>
                                                  </View>
                                                  <View style={{
                                                      flexDirection: 'row',
                                                      justifyContent: 'flex-end'
                                                  }}>
                                                      {_.filter(item.enrolments, (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}
                                                  </View>
                                              </View>
                                          </View>
                                          <View style={{
                                              borderBottomColor: Colors.GreyBackground,
                                              borderBottomWidth: 1,
                                          }}/>
                                      </View>
                                  </TouchableNativeFeedback>
                              }>

                    </ListView>
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