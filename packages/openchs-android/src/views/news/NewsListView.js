import React from "react";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {FlatList, SafeAreaView, StyleSheet, TouchableNativeFeedback, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import {NewsActionNames as Actions} from "../../action/news/NewsActions";
import NewsCard from "./NewsCard";

@Path('/newsListView')
class NewsListView extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.news);
    }

    viewName() {
        return 'NewsListView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    renderItem({item}) {
        return (
            <TouchableNativeFeedback key={item.uuid}
                                     onPress={() => {
                                     }}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <NewsCard news={item}/>
                </View>
            </TouchableNativeFeedback>
        )
    }

    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('news')}/>
                <SafeAreaView style={{marginTop: 10, marginBottom: 100}}>
                    <FlatList
                        data={this.state.news}
                        keyExtractor={(item) => item.uuid}
                        renderItem={this.renderItem}
                        initialNumToRender={50}
                        updateCellsBatchingPeriod={500}
                        maxToRenderPerBatch={20}
                    />
                </SafeAreaView>
            </CHSContainer>
        )
    }
}

export default NewsListView;

const styles = StyleSheet.create({
    cardContainer: {
        marginHorizontal: 16,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 5,
        paddingBottom: 5,
        borderRadius: 5,
    }
});
