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

class CommentCard extends AbstractComponent {

    static propTypes = {
        comment: PropTypes.object.isRequired,
        userName: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    getUserNameToDisplay(comment, myUserName) {
        return comment.createdByUsername === myUserName ? 'You' : comment.displayUsername;
    }

    onCommentEdit(comment) {
        this.dispatchAction(CommentActions.ON_EDIT, {comment})
    }

    onCommentDelete(comment) {
        this.dispatchAction(CommentActions.ON_DELETE, {openDeleteDialog: true, comment});
    }

    renderOptions(comment, myUserName) {
        const options = [
            {label: 'edit', fn: (comment) => this.onCommentEdit(comment)},
            {label: 'delete', fn: (comment) => this.onCommentDelete(comment)},
        ];
        if (comment.createdByUsername === myUserName) {
            return <Actions key={comment.uuid} actions={options} item={comment} color={Colors.DefaultPrimaryColor}/>
        }
        return <View/>
    }

    render() {
        const {comment, userName} = this.props;
        return (
                <View style={styles.cardContainer}>
                    <View style={{flex: 0.1}}>
                        <MCIcon name={'account-circle'} size={30}/>
                    </View>
                    <View style={{flex: 0.9}}>
                        <View style={{flex: 1, flexDirection: 'column'}}>
                            <View style={{flex: 1, flexDirection: 'row'}}>
                                <View style={{flex: 0.9, flexDirection: 'column'}}>
                                    <Text style={styles.titleTextStyle}>
                                        {this.getUserNameToDisplay(comment, userName)}
                                    </Text>
                                    <Text style={styles.timeTextStyle}>
                                        {General.toDisplayDateTime(comment.createdDateTime)}
                                    </Text>
                                </View>
                                <View style={{flex: 0.1, alignItems: 'flex-end'}}>
                                    {this.renderOptions(comment, userName)}
                                </View>
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.commentTextStyle}>
                                    {comment.text}
                                </Text>
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
});

export default CommentCard
