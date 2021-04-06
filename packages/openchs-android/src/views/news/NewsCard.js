import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {Image, SafeAreaView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Styles from "../primitives/Styles";
import React from 'react';
import MediaService from "../../service/MediaService";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import TypedTransition from "../../framework/routing/TypedTransition";
import NewsDetailView from "./NewsDetailView";
import Reducers from "../../reducer";
import {NewsActionNames as Actions} from "../../action/news/NewsActions";

class NewsCard extends AbstractComponent {

    static propTypes = {
        news: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.news);
        this.mediaService = context.getService(MediaService);
        this.state = {};
    }

    get imageUriInDevice() {
        const {heroImage} = this.props.news;
        return heroImage && this.mediaService.getAbsolutePath(heroImage, 'News');
    }

    componentDidMount() {
        this.setState({mounted: true});
        this.mediaService.exists(this.imageUriInDevice).then((exists) => {
            if (!this.state.mounted) return;
            this.setState((state) => ({
                ...state, exists
            }));
        });
    }

    componentWillUnmount() {
        this.setState({mounted: false});
    }

    onNewsPress(imageInfo, newsUUID) {
        const cb = () => TypedTransition.from(this).with({...imageInfo}).to(NewsDetailView, true);
        this.dispatchAction(Actions.ON_NEWS_PRESS, {newsUUID, cb});
    }

    renderImage(imageURI) {
        return this.state.exists ?
            <Image source={{uri: imageURI}} style={styles.imageStyle}/> :
            <View style={{marginTop: 15}}/>
    }

    render() {
        const {title, publishedDate, uuid, read} = this.props.news;
        const imageURI = `file://${this.imageUriInDevice}`;
        const newsPublishedDate = General.toDisplayDateTime(publishedDate);
        const imageInfo = {...this.props.news, exists: this.state.exists, imageURI, newsPublishedDate};
        return (
            <TouchableNativeFeedback key={uuid}
                                     onPress={this.onNewsPress.bind(this, imageInfo, uuid)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={[styles.cardContainer, {backgroundColor: read ? Colors.ReadCardColor : Colors.cardBackgroundColor}]}>
                    <SafeAreaView>
                        {this.renderImage(imageURI)}
                        <View style={styles.container}>
                            <Text style={styles.titleTextStyle}>{title}</Text>
                            <Text>{newsPublishedDate}</Text>
                        </View>
                    </SafeAreaView>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default NewsCard

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        paddingVertical: Styles.ContainerHorizontalDistanceFromEdge,
    },
    imageStyle: {
        height: 120,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5
    },
    titleTextStyle: {
        fontSize: 17,
        fontStyle: 'normal',
        color: Styles.blackColor,
        opacity: 0.87,
    },
    cardContainer: {
        marginHorizontal: 16,
        elevation: 2,
        marginVertical: 5,
        paddingBottom: 5,
        borderRadius: 5,
    }
});
