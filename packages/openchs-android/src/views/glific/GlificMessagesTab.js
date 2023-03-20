import AbstractComponent from '../../framework/view/AbstractComponent';
import PropTypes from 'prop-types';
import {SectionList, StyleSheet, View} from 'react-native';
import Colors from '../primitives/Colors';
import React from 'react';
import Distances from '../primitives/Distances';
import {Text} from 'native-base';
import Fonts from '../primitives/Fonts';
import General from '../../utility/General';
import _ from 'lodash';

class GlificMessagesTab extends AbstractComponent {
  static propTypes = {
    dataLoaded: PropTypes.bool.isRequired,
    failedToFetchMessages: PropTypes.bool.isRequired,
    msgList: PropTypes.array.isRequired,
    tabType: PropTypes.string.isRequired,
  };

  constructor(props, context) {
    super(props, context);
  }

  shouldComponentUpdate(nextProps, state) {
    return state === null || nextProps === null ||
      nextProps.failedToFetchMessages !== state.failedToFetchMessages ||
      nextProps.dataLoaded !== state.dataLoaded ||
      nextProps.tabType !== state.tabType ||
      nextProps.msgList !== state.msgList;
  }

  renderMessageView(msg) {
    const primaryDate = msg.insertedAt;
    const msgBody = msg.body;
    return <View style={styles.container}>
      <View
        style={styles.message}>
        <Text style={{fontSize: Fonts.Medium, color: Colors.DefaultPrimaryColor,}}>{msgBody}</Text>
        <Text style={{fontSize: Fonts.Small, color: Colors.SecondaryText}}>{General.toDisplayTime(primaryDate)}</Text>
      </View>
    </View>;
  }

  renderScheduledMessageView(msg) {
    const primaryDate = msg.scheduledDateTime;
    const messageRuleParams = msg.messageRuleParams;
    const messageTemplate = msg.messageTemplate.body;
    const msgBody = this.formatMsgTemplate(messageTemplate, messageRuleParams);

    return <View style={styles.container}>
      <View style={styles.message}>
        <Text style={{fontSize: Fonts.Medium, color: Colors.DefaultPrimaryColor,}}>{msgBody}</Text>
        <View style={styles.senderAndTime}>
            <Text style={{fontSize: Fonts.Small, color: Colors.SecondaryText}}>  - {msg.createdBy}</Text>
            <Text style={{fontSize: Fonts.Small, color: Colors.SecondaryText}}>{General.toDisplayTime(primaryDate)}</Text>
        </View>
      </View>
    </View>;
  }

  formatMsgTemplate = (str, params) => {
    let replacer = function (value, index) {
      str = str.replace(new RegExp("\\{\\{" + (index + 1) + "\\}\\}", "g"), value);
    };
    let paramsArray = params.replace(new RegExp("\\[|\\]", "g"), '').split(/[,]+/);
    paramsArray.forEach(replacer);
    return str;
  }

  renderSentMessagesList(tabTypeSentMessages) {
    const sectionWiseList = _
      .chain(this.props.msgList)
      .groupBy((msg) => General.toDisplayDate(tabTypeSentMessages ? msg.insertedAt : msg.scheduledDateTime))
      .map((value, key) => ({title: key, data: value}))
      .value();
    const getRenderSectionHeaderFooter = ({section: {title}}) => (
      <View style={{flex: 1, flexDirection: 'row'}}>
        <View style={{flex: 1}}>
        </View>
        <Text style={styles.heading}>{title}</Text>
        <View style={{flex: 1}}>
        </View>
      </View>
    );
    const footerHeaderProps = tabTypeSentMessages ? {
      renderSectionFooter: getRenderSectionHeaderFooter
    } : {
      renderSectionHeader: getRenderSectionHeaderFooter
    };
    return (<SectionList
      contentContainerStyle={{
        margin: Distances.ScaledContentDistanceFromEdge
      }}
      inverted={tabTypeSentMessages}
      sections={sectionWiseList}
      ListEmptyComponent={this.status(
        this.props.failedToFetchMessages ? "failedToFetchMsgs" :
          tabTypeSentMessages ? "emptySentMsgs" : "emptyScheduledMsgs", this.props.failedToFetchMessages)}
      renderItem={(msg) =>
        tabTypeSentMessages ? this.renderMessageView(msg.item) : this.renderScheduledMessageView(msg.item)}
      keyExtractor={(item, index) => item + index}
      {...footerHeaderProps}
    />);
  }

  status(text, isErrorMsg = false) {
    return (<View style={styles.errorScreen}>
      <Text style={[styles.statusMessage, isErrorMsg ? styles.errorMessageColor: {}]}>{this.I18n.t(text)}</Text>
    </View>);
  }

  render() {
    const tabTypeSentMsgs = this.props.tabType === "Sent Messages";
    return (
      <View style={styles.screen}>
        {this.renderSentMessagesList(tabTypeSentMsgs)}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    padding: Distances.ScaledContentDistanceFromEdge,
    margin: 4,
    elevation: 2,
    backgroundColor: Colors.cardBackgroundColor,
    marginVertical: 3,
    borderRadius: 10,
    display: 'flex',
    width: 'auto',
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  errorScreen: {
    padding: Distances.ScaledContentDistanceFromEdge,
    marginVertical: "70%",
    display: 'flex',
    alignSelf: 'center',
  },
  senderAndTime: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    display: 'flex',
    width: '100%',
  },
  message: {
    flexDirection: 'column',
    width: 'auto',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    fontSize: 20,
  },
  statusMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Distances.ScaledContentDistanceFromEdge,
    margin: Distances.ScaledContentDistanceFromEdge,
    alignSelf: 'center',
    fontSize: Fonts.Large,
    color: Colors.DefaultPrimaryColor,
    textAlign: 'center',
  },
  errorMessageColor: {
    color: Colors.RejectionMessageColor,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.ChatBackground,
    paddingTop: 10,
    paddingBottom: 10
  },
  heading: {
    borderRadius: 10,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    fontSize: Fonts.Large,
    textAlign: 'center',
    color: Colors.ChatSectionHeaderFontColor,
    backgroundColor: Colors.ChatSectionHeaderBackground,
  }
});

export default GlificMessagesTab;