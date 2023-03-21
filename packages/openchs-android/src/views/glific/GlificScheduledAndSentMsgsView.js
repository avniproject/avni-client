import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import General from "../../utility/General";
import Reducers from "../../reducer";
import {GlificActionNames as Actions, GlificActions} from "../../action/glific/GlificActions";
import Styles from "../primitives/Styles";
import PropTypes from "prop-types";
import Fonts from '../primitives/Fonts';
import GlificMessagesTab from './GlificMessagesTab';
import GlificService from '../../service/GlificService';
import {Spinner} from 'native-base';

@Path('/GlificScheduledAndSentMsgsView')
class GlificScheduledAndSentMsgsView extends AbstractComponent {

  static propTypes = {
    individualUUID: PropTypes.string.isRequired,
  };

  constructor(props, context) {
    super(props, context, Reducers.reducerKeys.glific);
  }

  viewName() {
    return 'GlificScheduledAndSentMsgsView';
  }

  UNSAFE_componentWillMount() {
    this.dispatchAction(Actions.ON_LOAD_SCHEDULED_AND_SENT_MSGS, {
      individualUUID: this.props.individualUUID, newState: GlificActions.getInitialState(this.context)
    });
    this.fetchMsgsSentForSubject();
    this.fetchMsgsScheduledForSubject();
    super.UNSAFE_componentWillMount();
  }

  fetchGlificContactDetailsForSubject() {
    this.context.getService(GlificService).getGlificContactDetailsForSubject(this.props.individualUUID)
      .then(response => {
        this.dispatchAction(Actions.ON_FETCH_OF_GLIFIC_CONTACT, {glificContact: response});
      })
      .catch(error => {
        this.dispatchAction(Actions.ON_FETCH_OF_GLIFIC_CONTACT, {glificContact: {}});
        General.logError("GlificScheduledAndSentMsgsView-fetchGlificContactDetailsForSubject", error);
      });
  }

  fetchMsgsSentForSubject() {
    this.fetchGlificContactDetailsForSubject();
    this.context.getService(GlificService).getAllMessagesForSubject(this.props.individualUUID)
      .then(response => {
        this.dispatchAction(Actions.ON_FETCH_OF_SENT_MSGS, {sentMessages: response, failedToFetchSentMessages: false});
      }).catch(error => {
      this.dispatchAction(Actions.ON_FETCH_OF_SENT_MSGS, {sentMessages: [], failedToFetchSentMessages: true});
      General.logError(`GlificScheduledAndSentMsgsView-fetchMsgsSentForSubject-${this.props.individualUUID}`, error);
    });
  }

  fetchMsgsScheduledForSubject() {
    this.context.getService(GlificService).getAllMessagesNotYetSentForSubject(this.props.individualUUID)
      .then(response => {
        this.dispatchAction(Actions.ON_FETCH_OF_SCHEDULED_MSGS, {
          scheduledMessages: response, failedToFetchScheduledMessages: false
        });
      }).catch(error => {
      this.dispatchAction(Actions.ON_FETCH_OF_SCHEDULED_MSGS, {
        scheduledMessages: [], failedToFetchScheduledMessages: true
      });
      General.logError(`GlificScheduledAndSentMsgsView-fetchMsgsScheduledForSubject-${this.props.individualUUID}`, error);
    });
  }

  onBackPress() {
    this.goBack();
  }

  renderOptions = options => options.filter((option) => _.last(option)).map(([icon, name, onPress, isSelected], index) => {
    return (<View key={index} style={{
      borderBottomWidth: isSelected ? 4 : 0, borderColor: Colors.iconSelectedColor,
    }}>
      <TouchableOpacity onPress={onPress}
                        style={{flex: 1, alignItems: 'center'}}>
        <View key={index} style={{paddingTop: 5}}>
          {icon}
          <Text style={{
            fontSize: Fonts.Small,
            fontWeight: isSelected ? 'bold' : 'normal',
            color: isSelected ? Colors.iconSelectedColor : Colors.DarkPrimaryColor
          }}>{name}</Text>
        </View>
      </TouchableOpacity>
    </View>);
  });

  icon = (Icon, iconName, isSelected) => {
    return <Icon name={iconName}
                 style={[styles.iconStyle, isSelected && {color: Colors.iconSelectedColor}]}/>
  };

  spinner() {
    return ((this.state.showSpinnerWhileLoadingSentMessages || this.state.showSpinnerWhileLoadingScheduledMessages) && (
      <View style={styles.spinner}>
        <Spinner/>
      </View>));
  }

  glificMessagesTab() {
    const sentMsgsTabType = (this.state.tabType === GlificActions.TAB_TYPE_SENT_MSGS);
    const dataLoaded = sentMsgsTabType ? this.state.setMsgsSentAvailable : this.state.setMsgsScheduledAvailable;
    const failedToFetchMessages = sentMsgsTabType ? this.state.failedToFetchSentMessages : this.state.failedToFetchScheduledMessages;
    const msgList = sentMsgsTabType ? this.state.sentMessages : this.state.scheduledMessages;
    const loading = (this.state.showSpinnerWhileLoadingGlificContact || this.state.showSpinnerWhileLoadingSentMessages || this.state.showSpinnerWhileLoadingScheduledMessages)
    return loading ?
      <View />
      :
      <GlificMessagesTab dataLoaded={dataLoaded}
                         failedToFetchMessages={failedToFetchMessages}
                         msgList={msgList}
                         tabType={this.state.tabType}
                         glificContact={this.state.glificContact}
      />;
  }

  render() {
    General.logDebug(this.viewName(), 'render');
    const options = [[this.icon(MCIcon, 'view-list',
      this.state.tabType === GlificActions.TAB_TYPE_SENT_MSGS),
      this.I18n.t('sentMessages'),
      () => this.dispatchAction(Actions.ON_SENT_MSGS_CLICK),
      this.state.tabType === GlificActions.TAB_TYPE_SENT_MSGS, true],
      [this.icon(MCIcon, 'view-list',
        this.state.tabType === GlificActions.TAB_TYPE_SCHEDULED_MSGS),
        this.I18n.t('scheduledMessages'),
        () => this.dispatchAction(Actions.ON_SCHEDULED_MSGS_CLICK),
        this.state.tabType === GlificActions.TAB_TYPE_SCHEDULED_MSGS, true],];
    return (<CHSContainer>
      <View style={styles.header}>
        <AppHeader title={this.I18n.t('GlificMessagesList')} hideIcon={true}
                   func={this.onBackPress.bind(this)}/>
      </View>
      <View style={styles.screen}>
        {this.glificMessagesTab()}
        {this.spinner()}
      </View>
      <View style={styles.footer}>
        <View style={styles.tabContainer}>
          {this.renderOptions(options)}
        </View>
      </View>
    </CHSContainer>);
  }
}

export default GlificScheduledAndSentMsgsView

const styles = StyleSheet.create({
  header: {
    backgroundColor: Styles.defaultBackground
  }, screen: {
    flex: 41, justifyContent: 'space-between', backgroundColor: Colors.ChatBackground
  }, footer: {
    flex: 3, backgroundColor: Styles.defaultBackground, justifyContent: 'space-between',
  }, btnAdd: {
    height: 50,
    width: 50,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.AccentColor,
    elevation: 2,
  }, iconSend: {
    alignSelf: 'center', color: Styles.whiteColor
  }, tabContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.programEnrolmentBottomBarColor,
    elevation: 3,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.Separator, // opacity: 0.2
  }, spinner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: Colors.ChatBackground
  }, iconStyle: {
    color: Colors.DarkPrimaryColor, opacity: 0.8, alignSelf: 'center', fontSize: 20
  }
});