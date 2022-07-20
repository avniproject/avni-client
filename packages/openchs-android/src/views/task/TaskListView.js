import React from 'react';
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {FlatList, SafeAreaView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";

@Path('/taskListView')
class TaskListView extends AbstractComponent {

    static propTypes = {
        results: PropTypes.object.isRequired,
        backFunction: PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return 'TaskListView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    onBackPress() {
        this.props.backFunction();
    }

    ItemView({item}) {
        return (
            <TouchableNativeFeedback key={item.uuid}
                                     onPress={() => {}}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <Text>{item.name}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    };

    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}
                          style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('openTasks')} func={this.onBackPress.bind(this)}/>
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={this.props.results}
                        keyExtractor={(item) => item.uuid}
                        enableEmptySections={true}
                        renderItem={item => this.ItemView(item)}
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

export default TaskListView;
