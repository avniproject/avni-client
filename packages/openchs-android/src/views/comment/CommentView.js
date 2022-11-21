import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {FlatList, StyleSheet, TouchableNativeFeedback, TouchableOpacity, View} from 'react-native';
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import General from "../../utility/General";
import Reducers from "../../reducer";
import {CommentActionNames as Actions} from "../../action/comment/CommentActions";
import Styles from "../primitives/Styles";
import PropTypes from "prop-types";
import TypedTransition from "../../framework/routing/TypedTransition";
import CommentDiscussionView from "./CommentDiscussionView";
import CommentCard from "./CommentCard";
import NewThreadModal from "./NewThreadModal";

@Path('/commentView')
class CommentView extends AbstractComponent {

    static propTypes = {
        individualUUID: PropTypes.string.isRequired,
        refreshCountActionName: PropTypes.string.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    viewName() {
        return 'CommentView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    onBackPress() {
        this.dispatchAction(this.props.refreshCountActionName, {individualUUID: this.props.individualUUID});
        this.goBack();
    }

    onThreadPress(threadUUID) {
        TypedTransition.from(this).with({threadUUID}).to(CommentDiscussionView, true)
    }

    renderItem(item, onThreadPress) {
        return (
            <TouchableNativeFeedback key={item.uuid}
                                     onPress={() => onThreadPress(item.commentThread.uuid)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <CommentCard renderStatus={true} comment={item}/>
                </View>
            </TouchableNativeFeedback>
        )
    }

    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.CommentBackgroundColor}}>
                <AppHeader title={this.I18n.t('commentThreads')} hideIcon={true} func={this.onBackPress.bind(this)}/>
                <View style={styles.container}>
                    <FlatList data={this.state.threadComments}
                              keyExtractor={(item) => item.uuid}
                              renderItem={({item}) => this.renderItem(item, this.onThreadPress.bind(this))}/>
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.btnAdd}
                                          onPress={() => this.dispatchAction(Actions.ON_NEW_THREAD, {showNewThreadModal: true})}>
                            <MCIcon name={'plus'} size={30} style={styles.iconSend}/>
                        </TouchableOpacity>
                    </View>
                    <NewThreadModal open={this.state.showNewThreadModal}
                                    onClose={() => this.dispatchAction(Actions.ON_NEW_THREAD, {showNewThreadModal: false})}/>
                </View>
            </CHSContainer>
        );
    }
}

export default CommentView

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 2
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        right: 20
    },
    btnAdd: {
        height: 50,
        width: 50,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.AccentColor,
        elevation: 2,
    },
    iconSend: {
        alignSelf: 'center',
        color: Styles.whiteColor
    },
    cardContainer: {
        elevation: 1,
        backgroundColor: Colors.cardBackgroundColor,
        marginBottom: 1,
        minHeight: 100
    },
});
