import React from "react";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import {FlatList, SafeAreaView, StyleSheet} from "react-native";
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

    render() {
        General.logDebug(this.viewName(), "render");
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('news')}/>
                <SafeAreaView style={{marginTop: 10, marginBottom: 100}}>
                    <FlatList
                        data={this.state.news}
                        keyExtractor={(item) => item.uuid}
                        renderItem={({item}) => <NewsCard news={item}/>}
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
