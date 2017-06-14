import AbstractComponent from "../../framework/view/AbstractComponent";
import {TouchableNativeFeedback, View, ListView, Dimensions, Text, Platform} from "react-native";
import React from "react";
import Path from "../../framework/routing/Path";
import GlobalStyles from "../primitives/GlobalStyles";
import {Button, Icon} from "native-base";
import AppHeader from "../common/AppHeader";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Svg,{Line} from 'react-native-svg';

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: React.PropTypes.array.isRequired
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
            <Button key={index} disabled
                    style={{
                        marginLeft: 8,
                        width: 74,
                        height: 22,
                        backgroundColor: program.colour
                    }}>{program.name}</Button>
        );
    }

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.Ripple(Colors.DarkPrimaryColor) :
            TouchableNativeFeedback.SelectableBackground();
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
                    <ListView dataSource={dataSource}
                              renderRow={(item) =>
                    <TouchableNativeFeedback onPress={() => this.onResultRowPress(item)}
                                                   background={this.background()}>
                        <View style={{flexDirection: 'column', height: 72, justifyContent: 'space-between', paddingHorizontal: 16}}>
                              <View style={{flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center'}}>
                                  <Icon name='person-pin' style={{color: Colors.AccentColor, fontSize: 40, paddingRight: 16, width: 72}}/>
                                  <View style={{ flexDirection: 'column', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'flex-start', flex: 1}}>
                                      <Text style={{fontSize: Fonts.Large}}>{item.name}</Text>
                                      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start'}}>
                                      <Text style={{fontSize: Fonts.Normal}}>{item.gender.name}</Text>
                                          <Text style={this.scaleStyle({ paddingLeft: 8, paddingRight: 8})}></Text>
                                          <Text style={{fontSize: Fonts.Normal}} note>{item.getDisplayAge(i18n)}</Text>
                                      </View>
                                  </View>
                                  <View style={{
                                      flexDirection: 'column',
                                      flexWrap: 'nowrap',
                                      justifyContent: 'center',
                                      alignItems: 'flex-end'
                                  }}>
                                      <View style={{justifyContent: 'flex-end'}}>
                                          <Text style={{fontSize: Fonts.Large}}>{item.lowestAddressLevel.name}</Text>
                                      </View>
                                      <View style={{ justifyContent: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end'}}>
                                      {_.filter(item.enrolments, (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}
                                      </View>
                                  </View>
                              </View>
                            <Svg height="1" width={width}><Line x1="0" x2={width} y1="0" y2="0" stroke={Colors.GreyBackground} strokeWidth="1"/></Svg>
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
        CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
    }
}

export default IndividualSearchResultsView;