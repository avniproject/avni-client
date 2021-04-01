import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import React from "react";
import {FlatList, SafeAreaView, StyleSheet, TouchableNativeFeedback, View} from "react-native";
import CommentCard from "./CommentCard";
import UserInfoService from "../../service/UserInfoService";

@Path('/commentListView')
class CommentListView extends AbstractComponent {

    static propTypes = {
        results: PropTypes.object.isRequired,
        onIndividualSelection: PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        this.username = context.getService(UserInfoService).getUserInfo().username;
    }

    viewName() {
        return 'CommentListView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    ItemView({item}, onCommentPress) {
        return (
            <TouchableNativeFeedback key={item.uuid}
                                     onPress={() => onCommentPress(this, item.subject)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <CommentCard renderSubjectName={true} comment={item}/>
                </View>
            </TouchableNativeFeedback>
        );
    };

    onBackPress() {
        this.props.onBackFunc();
        this.goBack();
    }

    render() {
        General.logDebug(this.viewName(), "render");
        const onCommentPress = this.props.onIndividualSelection;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.CommentBackgroundColor}}>
                <AppHeader title={this.I18n.t('openComments')} func={this.onBackPress.bind(this)}/>
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={this.props.results}
                        keyExtractor={(item) => item.uuid}
                        enableEmptySections={true}
                        renderItem={item => this.ItemView(item, onCommentPress)}
                    />
                </SafeAreaView>
            </CHSContainer>
        )
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 16,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 5,
        paddingBottom: 5,
        borderRadius: 5,
        minHeight: 100
    }
});

export default CommentListView;
