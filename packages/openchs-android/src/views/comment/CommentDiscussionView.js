import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import PropTypes from "prop-types";
import Reducers from "../../reducer";
import {CommentActionNames as Actions} from "../../action/comment/CommentActions";
import {FlatList, StyleSheet, TextInput, TouchableOpacity, View} from "react-native";
import CommentCard from "./CommentCard";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Styles from "../primitives/Styles";
import CommentThreadService from "../../service/comment/CommentThreadService";
import {AvniAlert} from "../common/AvniAlert";

@Path('/commentDiscussionView')
class CommentDiscussionView extends AbstractComponent {

    static propTypes = {
        threadUUID: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    viewName() {
        return 'CommentDiscussionView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_THREAD_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }

    renderItem(item, index) {
        const extraStyles = index === 0 ? {} : {borderRadius: 4, marginHorizontal: 18, marginVertical: 5};
        return (
            <View style={[styles.cardContainer, extraStyles]}>
                <CommentCard renderOptions={true} comment={item}/>
            </View>
        )
    }

    resolveThread() {
        const onYesPress = () => {
            this.dispatchAction(Actions.ON_THREAD_RESOLVE, {threadUUID: this.props.threadUUID});
            this.goBack()
        };
        AvniAlert(this.I18n.t('resolveMessageTitle'), this.I18n.t('resolveMessageDetails'), onYesPress, this.I18n, true);
    }

    render() {
        General.logDebug(this.viewName(), "render");
        const commentThread = this.getService(CommentThreadService).findByUUID(this.props.threadUUID);
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.CommentBackgroundColor}}>
                <AppHeader title={this.I18n.t('discussion')} iconFunc={this.resolveThread.bind(this)}
                           renderCommentResolve={!commentThread.isResolved()} hideIcon={true}/>
                <View style={styles.container}>
                    <FlatList ref={ref => this.flatList = ref}
                              onContentSizeChange={() => this.flatList.scrollToEnd({animated: true})}
                              onLayout={() => this.flatList.scrollToEnd({animated: true})}
                              data={this.state.comments}
                              keyExtractor={(item) => item.uuid}
                              renderItem={({item, index}) => this.renderItem(item, index)}/>
                    <View style={styles.footer}>
                        <View style={styles.inputContainer}>
                            <TextInput style={styles.inputs}
                                       value={this.state.comment.text}
                                       placeholder={this.I18n.t('commentOnThread')}
                                       underlineColorAndroid='transparent'
                                       onChangeText={(value) => this.dispatchAction(Actions.ON_CHANGE_TEXT, {value})}
                                       multiline={true}/>
                        </View>
                        <TouchableOpacity style={styles.btnSend}
                                          onPress={() => this.dispatchAction(Actions.ON_SEND, {threadUUID: this.props.threadUUID})}>
                            <MCIcon name={'send'} size={25} style={styles.iconSend}/>
                        </TouchableOpacity>
                    </View>
                </View>
            </CHSContainer>
        );
    }

}

export default CommentDiscussionView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 2
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 60,
        backgroundColor: Colors.CommentBackgroundColor,
        paddingHorizontal: 10,
        padding: 5,
    },
    btnSend: {
        backgroundColor: Colors.ActionButtonColor,
        width: 40,
        height: 40,
        borderRadius: 360,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSend: {
        alignSelf: 'center',
        color: Styles.whiteColor
    },
    inputContainer: {
        borderBottomColor: '#F5FCFF',
        backgroundColor: Styles.whiteColor,
        borderRadius: 30,
        borderBottomWidth: 1,
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    inputs: {
        minHeight: 40,
        marginLeft: 16,
        borderBottomColor: Styles.whiteColor,
        flex: 1
    },
    cardContainer: {
        backgroundColor: Colors.cardBackgroundColor,
        marginBottom: 10,
        paddingBottom: 5,
    },
});
