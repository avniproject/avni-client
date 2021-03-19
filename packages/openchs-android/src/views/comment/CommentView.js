import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import React from 'react';
import {FlatList, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import General from "../../utility/General";
import Reducers from "../../reducer";
import {CommentActionNames as Actions} from "../../action/comment/CommentActions";
import CommentCard from "./CommentCard";
import Styles from "../primitives/Styles";

@Path('/commentView')
class CommentView extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.comment);
    }

    viewName() {
        return 'CommentView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {props: this.props});
        super.componentWillMount();
    }

    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.CommentBackgroundColor}}>
                <AppHeader title={this.I18n.t('comments')} hideIcon={true}/>
                <View style={styles.container}>
                    <FlatList data={this.state.comments}
                              keyExtractor={(item) => item.uuid}
                              renderItem={({item}) =>
                                  <CommentCard
                                      comment={item}
                                      userName={this.state.userInfo.username}/>
                              }/>
                    <View style={styles.footer}>
                        <View style={styles.inputContainer}>
                            <TextInput style={styles.inputs}
                                       value={this.state.newCommentText}
                                       placeholder="Write a message..."
                                       underlineColorAndroid='transparent'
                                       onChangeText={(value) => this.dispatchAction(Actions.ON_CHANGE_TEXT, {value})}
                                       multiline={true}/>
                        </View>
                        <TouchableOpacity style={styles.btnSend} onPress={() => this.dispatchAction(Actions.ON_SEND)}>
                            <MCIcon name={'send'} size={25} style={styles.iconSend}/>
                        </TouchableOpacity>
                    </View>
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
    }
});
