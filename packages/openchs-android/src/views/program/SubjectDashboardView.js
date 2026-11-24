import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {View, TouchableOpacity, Text, StyleSheet, ToastAndroid, ScrollView, ActivityIndicator} from 'react-native';
import SubjectDashboardGeneralTab from "../individual/SubjectDashboardGeneralTab";
import PropTypes from 'prop-types';
import Colors from "../primitives/Colors";
import IndividualProfile from "../common/IndividualProfile";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import SubjectDashboardProfileTab from "../individual/SubjectDashboardProfileTab";
import SubjectDashboardProgramsTab from "./SubjectDashboardProgramsTab";
import CHSContent from "../common/CHSContent";
import General from "../../utility/General";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import {Names as Actions} from "../../action/program/SubjectDashboardViewActions";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import _ from "lodash";
import NewFormButton from "../common/NewFormButton";
import {logScreenEvent} from "../../utility/Analytics";

class SubjectDashboardView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: PropTypes.string,
        individualUUID: PropTypes.string,
        message: PropTypes.string,
        backFunction: PropTypes.func,
        tab: PropTypes.number,
        messageDisplayed: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.subjectDashboardView);
    }

    // Deferred: this view's own entry work is ~200-700ms and it runs during the navigation slide,
    // which was visible as jank on device. Its heavy children (Programs/Profile/General tabs) defer
    // independently now, so this loader only ever covers this view's own work.
    // (avni-client#2054)
    loadData() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
    }

    displayMessage(message) {
        if (message && this.state.messageDisplayed) {
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.dispatchAction(Actions.DISPLAY_MESSAGE)
        }

    }

    // Mirrors LandingView's home-screen bottom bar pattern (bottomBarItemContent/activeIconPillStyle):
    // white bar, active tab's icon sits in a small BrandLight pill, text switches to BrandPrimaryDark.
    static selectedTabColor = Colors.BrandPrimaryDark;
    static unselectedTabColor = Colors.TextPrimaryDark;
    static bottomBarBackgroundColor = Colors.bottomBarColor;
    static tabBarHeight = 68;
    static activeIconPillStyle = {width: 72, height: 36, borderRadius: 18, backgroundColor: Colors.BrandLight};

    static iconStyle = {color: SubjectDashboardView.unselectedTabColor, alignSelf: 'center', fontSize: 20};

    icon = (Icon, iconName, isSelected) => {
        return <Icon name={iconName}
                     style={[SubjectDashboardView.iconStyle, isSelected && {color: SubjectDashboardView.selectedTabColor}]}/>
    };

    // Tab switches (Profile/Programs/General) don't remount this screen, so componentDidMount's
    // screen_view never refires on tab change. Log a virtual sub-screen instead, reusing the
    // existing screen_view/screen_load_time mechanism rather than inventing a new event shape.
    // Guarded on alreadyActive so re-tapping the current tab doesn't fire a duplicate view.
    onTabPress = (actionName, alreadyActive, virtualScreenSuffix) => () => {
        if (!alreadyActive) {
            logScreenEvent(`${this.viewName()}/${virtualScreenSuffix}`);
        }
        this.dispatchAction(actionName);
    };

    renderOptions = options => options.filter((option) => _.last(option)).map(([icon, name, onPress, isSelected], index) => {
        return (
            <View key={index} style={{flex: 1, flexDirection: 'column'}}>
                <TouchableOpacity onPress={onPress} activeOpacity={0.6}
                                  style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                    <View style={[{
                        width: 72,
                        height: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4
                    }, isSelected && SubjectDashboardView.activeIconPillStyle]}>
                        {icon}
                    </View>
                    <Text style={{
                        fontSize: Fonts.Small,
                        color: isSelected ? SubjectDashboardView.selectedTabColor : SubjectDashboardView.unselectedTabColor
                    }}>{name}</Text>
                </TouchableOpacity>
            </View>
        );
    });

    // Header and back button stay on screen rather than the base class's full-area white. This view is
    // the container for all three tabs; blanking it blanks the whole dashboard, which on a large
    // database read as the app having died. backFunction comes from props, so back works while loading.
    renderLoading() {
        return (
            <CHSContainer>
                <CHSContent style={{backgroundColor: Colors.GreyContentBackground}}>
                    <View style={{backgroundColor: Styles.defaultBackground}}>
                        <AppHeader title={this.I18n.t('individualDashboard')} func={this.props.backFunction}/>
                    </View>
                    <View style={{minHeight: 200, justifyContent: 'center', alignItems: 'center',
                                  backgroundColor: Colors.WhiteContentBackground}}>
                        <ActivityIndicator size="large"/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }

    renderLoaded() {
        General.logDebug(this.viewName(), 'render');
        const {enrolmentUUID, individualUUID, backFunction} = this.state;
        const options = [
            [this.icon(MCIcon, 'account', this.state.individualProfile), this.I18n.t('profile'), this.onTabPress(Actions.ON_PROFILE_CLICK, this.state.individualProfile, 'Profile'), this.state.individualProfile, true],
            [this.icon(MCIcon, 'clipboard-list-outline', this.state.program), this.I18n.t('programs'), this.onTabPress(Actions.ON_PROGRAM_CLICK, this.state.program, 'Programs'), this.state.program, this.state.displayProgramTab],
            [this.icon(MCIcon, 'view-list', this.state.history), this.I18n.t('general'), this.onTabPress(Actions.ON_HISTORY_CLICK, this.state.history, 'General'), this.state.history, this.state.displayGeneralTab],
        ];
        this.displayMessage(this.props.message);
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('individualDashboard')} func={this.props.backFunction}/>
                <CHSContent>
                    <ScrollView style={{backgroundColor: Colors.GreyContentBackground}}
                                contentContainerStyle={this.state.displayProgramTab ? {
                                    paddingBottom: SubjectDashboardView.tabBarHeight
                                } : {}}>
                        <IndividualProfile individual={this.state.individual}
                                           displayOnly={false}
                                           viewContext={IndividualProfile.viewContext.NonWizard}
                                           programsAvailable={this.state.programsAvailable}
                                           hideEnrol={this.state.hideEnrol}
                        />
                        {this.state.individualProfile && (
                            <SubjectDashboardProfileTab
                                params={{individualUUID: individualUUID, displayGeneralInfoInProfileTab: this.state.displayGeneralInfoInProfileTab}}/>
                        )}
                        {this.state.program && (
                            <SubjectDashboardProgramsTab
                                enrolmentUUID={enrolmentUUID} individualUUID={individualUUID} backFunction={backFunction}/>
                        )}
                        {this.state.history && (
                            <SubjectDashboardGeneralTab params={{individualUUID: individualUUID}}/>
                        )}
                    </ScrollView>
                </CHSContent>
                <NewFormButton
                    display={(this.state.individualProfile && this.state.displayGeneralInfoInProfileTab) || this.state.history}
                    style={this.state.displayProgramTab ? {bottom: 24 + SubjectDashboardView.tabBarHeight} : {}}
                />
                {this.state.displayProgramTab &&
                <View style={styles.tabContainerWrapper}>
                    <View style={styles.tabContainer}>
                        {this.renderOptions(options)}
                    </View>
                </View>}
            </CHSContainer>
        );
    }

}

export default SubjectDashboardView


const styles = StyleSheet.create({
    tabContainerWrapper: {
        height: SubjectDashboardView.tabBarHeight,
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: SubjectDashboardView.tabBarHeight,
        width: '100%',
        backgroundColor: SubjectDashboardView.bottomBarBackgroundColor,
        elevation: 3,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: Colors.Separator
    }
});
