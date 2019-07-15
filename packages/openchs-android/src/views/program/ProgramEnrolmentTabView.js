import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet, ToastAndroid, ScrollView} from 'react-native';
import IndividualGeneralHistoryView from "../individual/IndividualGeneralHistoryView";
import PropTypes from 'prop-types';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import IndividualProfile from "../common/IndividualProfile";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import IndividualRegistrationDetailView from "../individual/IndividualRegistrationDetailView";
import ProgramEnrolmentDashboardView from "./ProgramEnrolmentDashboardView";
import CHSContent from "../common/CHSContent";
import Path from "../../framework/routing/Path";
import General from "../../utility/General";
import Fonts from "../primitives/Fonts";
import {ProgramEnrolmentTabActionsNames as Actions} from "../../action/program/ProgramEnrolmentTabActions";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import OIcon from "react-native-vector-icons/Octicons";


@Path('/ProgramEnrolmentTabView')
class ProgramEnrolmentTabView extends AbstractComponent {

    static propTypes = {
        individualUUID: PropTypes.string,
        tab: PropTypes.number,
    };

    viewName() {
        return "ProgramEnrolmentTabView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolmentTab);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params || this.props);
        return super.componentWillMount();
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE)
        }

    }

    static iconStyle = {color: Colors.programEnrolmentBottomBarIconColor, opacity: 0.8, alignSelf: 'center', fontSize: 20};

    icon = (Icon, iconName, isSelected) => {
        return <Icon name={iconName}
                     style={[ProgramEnrolmentTabView.iconStyle, isSelected && {color: Colors.iconSelectedColor}]}/>
    };

    renderOptions = options => options.map(([icon, name, onPress, isSelected], index) => {
        return (
            <View style={{
                flex: 1,
                flexDirection: 'column',
                borderBottomWidth: isSelected ? 4 : 0,
                borderColor: Colors.iconSelectedColor,
            }}>
                <TouchableOpacity onPress={onPress}
                                  style={{flex: 1, alignItems: 'center'}}>
                    <View key={index} style={{paddingTop: 5}}>
                        {icon}
                        <Text style={{
                            fontSize: Fonts.Small,
                            fontWeight: isSelected ? 'bold' : 'normal',
                            color: isSelected ? Colors.iconSelectedColor : Colors.programEnrolmentBottomBarIconColor
                        }}>{name}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    });

    render() {
        General.logDebug(this.viewName(), 'render');
        const {enrolmentUUID, individualUUID, backFunction} = this.state;
        const options = [
            [this.icon(MCIcon, 'face-profile', this.state.individualProfile), this.I18n.t('profile'), () => this.dispatchAction(Actions.ON_PROFILE_CLICK), this.state.individualProfile],
            [this.icon(OIcon, 'project', this.state.program), this.I18n.t('programs'), () => this.dispatchAction(Actions.ON_PROGRAM_CLICK), this.state.program],
            [this.icon(MCIcon, 'view-list', this.state.history), this.I18n.t('general'), () => this.dispatchAction(Actions.ON_HISTORY_CLICK), this.state.history],
        ];
        this.displayMessage(this.props.message || this.props.params && this.props.params.message);
        return (
            <CHSContainer>
                <CHSContent style={{backgroundColor: Colors.GreyContentBackground}}>
                    <View style={{backgroundColor: Styles.defaultBackground}}>
                        <AppHeader title={this.I18n.t('individualDashboard')} func={this.props.backFunction}/>
                        <IndividualProfile style={{marginHorizontal: 16}}
                                           individual={this.state.individual}
                                           viewContext={IndividualProfile.viewContext.Program}
                                           programsAvailable={this.state.programsAvailable}
                                           hideEnrol={this.state.hideEnrol}
                        />
                    </View>
                    {this.state.individualProfile &&
                    <IndividualRegistrationDetailView params={{individualUUID: individualUUID}}/>}
                    {this.state.program &&
                    <ProgramEnrolmentDashboardView enrolmentUUID={enrolmentUUID} individualUUID={individualUUID}
                                                   backFunction={backFunction}/>}
                    {this.state.history &&
                    <IndividualGeneralHistoryView params={{individualUUID: individualUUID}}/>}
                </CHSContent>
                <View style={styles.tabContainer}>
                    {this.renderOptions(options)}
                </View>
            </CHSContainer>
        );
    }

}

export default ProgramEnrolmentTabView


const styles = StyleSheet.create({
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: 55,
        width: '100%',
        position: 'absolute',
        bottom: 0,
        backgroundColor: Colors.programEnrolmentBottomBarColor,
        elevation: 3,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.Separator
    }
});
