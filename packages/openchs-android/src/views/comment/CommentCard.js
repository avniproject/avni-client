import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {StyleSheet, Text, View} from "react-native";
import Styles from "../primitives/Styles";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import Actions from "../groupSubject/Actions";
import Reducers from "../../reducer";
import {CommentActionNames as CommentActions} from "../../action/comment/CommentActions";
import {AvniAlert} from "../common/AvniAlert";
import {CommentThread} from 'avni-models';
import UserInfoService from "../../service/UserInfoService";
import _ from 'lodash';

class CommentCard extends AbstractComponent {

    static propTypes = {
        comment: PropTypes.object.isRequired,
        renderStatus: PropTypes.bool,
        renderOptions: PropTypes.bool,
        renderSubjectName: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
        this.userName = _.get(context.getService(UserInfoService).getUserInfo(), 'username')
    }

    getUserNameToDisplay(comment) {
        return comment.createdByUsername === this.userName ? 'You' : comment.displayUsername;
    }

    onCommentEdit(comment) {
        this.dispatchAction(CommentActions.ON_EDIT, {comment})
    }

    onCommentDelete(comment) {
        AvniAlert(this.I18n.t('deleteMessageTitle'), this.I18n.t('deleteMessageDetails'), () => this.dispatchAction(CommentActions.ON_DELETE, {comment}), this.I18n, true)
    }

    renderOptions(comment) {
        const options = [
            {label: 'edit', fn: (comment) => this.onCommentEdit(comment)},
            {label: 'delete', fn: (comment) => this.onCommentDelete(comment)},
        ];
        if (comment.createdByUsername === this.userName) {
            return <Actions key={comment.uuid} actions={options} item={comment} color={Colors.DefaultPrimaryColor}/>
        }
        return <View/>
    }

    renderStatus(comment) {
        const status = comment.commentThread.status;
        const statusColor = CommentThread.threadStatus.Open === status ? Colors.SubjectTypeColor : Colors.AccentColor;
        return <View style={[styles.statusContainer, {borderColor: statusColor}]}>
            <Text style={[styles.statusTextStyle, {color: statusColor}]}>{status}</Text>
        </View>
    }

    renderSubjectName(comment) {
        return <View style={styles.subjectNameContainer}>
            <Text style={styles.subjectNameText}>{comment.subject.nameString}</Text>
        </View>
    }

    renderMessageText(text, hideEntireMessage) {
        const extraProps = hideEntireMessage ? {numberOfLines: 2} : {};
        return <Text style={styles.commentTextStyle} {...extraProps}>{text}</Text>;
    }

    render() {
        const {comment, renderStatus, renderSubjectName} = this.props;
        return (
            <View style={styles.cardContainer}>
                <View style={{minWidth: 30 , marginRight: 1}}>
                    <MCIcon name={'account-circle'} size={30}/>
                </View>
                <View style={{flex: 1}}>
                    <View style={{flex: 1, flexDirection: 'column'}}>
                        <View style={{flex: 1, flexDirection: 'row'}}>
                            <View style={{flex: 0.6, flexDirection: 'column', minWidth:20}}>
                                <Text style={styles.titleTextStyle}>
                                    {this.getUserNameToDisplay(comment)}
                                </Text>
                                <Text style={styles.timeTextStyle}>
                                    {General.toDisplayDateTime(comment.createdDateTime)}
                                </Text>
                            </View>
                            <View style={{flex: 0.4, alignItems: 'flex-end'}}>
                                {this.props.renderStatus && this.renderStatus(comment)}
                                {this.props.renderOptions && this.renderOptions(comment)}
                                {this.props.renderSubjectName && this.renderSubjectName(comment)}
                            </View>
                        </View>
                        <View style={{flex: 1}}>
                            {this.renderMessageText(comment.text, renderStatus || renderSubjectName)}
                        </View>
                    </View>
                </View>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        paddingVertical: Styles.ContainerHorizontalDistanceFromEdge,
    },
    titleTextStyle: {
        fontSize: 13,
        fontStyle: 'normal',
        color: Styles.blackColor,
        fontWeight: 'bold',
        opacity: 0.87,
    },
    timeTextStyle: {
        fontSize: 11,
        fontStyle: 'normal',
        color: Styles.blackColor,
        opacity: 0.54
    },
    commentTextStyle: {
        fontSize: 13,
        fontStyle: 'normal',
        color: Styles.blackColor,
        opacity: 0.87,
    },
    statusContainer: {
        borderWidth: 1,
        minHeight: 22,
        marginRight: 5,
        borderRadius: 3,
        paddingHorizontal: 5,
        backgroundColor: '#FFFFFF',
        paddingTop: 2,
    },
    statusTextStyle: {
        textTransform: 'uppercase',
        fontSize: Styles.smallTextSize,
        fontStyle: 'normal',
        fontWeight: 'bold',
    },
    subjectNameContainer: {
        minHeight: 22,
        marginRight: 5,
        borderRadius: 3,
        paddingHorizontal: 5,
        backgroundColor: Colors.SubjectTypeColor,
        paddingTop: 2
    },
    subjectNameText: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal',
        color: Styles.whiteColor,
    }
});

export default CommentCard
