import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import {Image, SafeAreaView, StyleSheet, Text, View} from "react-native";
import General from "../../utility/General";
import MediaService from "../../service/MediaService";
import Styles from "../primitives/Styles";
import React from 'react';

class NewsCard extends AbstractComponent {

    static propTypes = {
        news: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {title, publishedDate, heroImage, uuid} = this.props.news;
        const filePath = this.getService(MediaService).getAbsolutePath(heroImage, 'News');
        return (
            <SafeAreaView>
                {heroImage && <Image source={{uri: `file://${filePath}`}} style={styles.imageStyle}/>}
                <View style={styles.container}>
                    <Text style={styles.titleTextStyle}>{title}</Text>
                    <Text>{General.toDisplayDateTime(publishedDate)}</Text>
                </View>
            </SafeAreaView>
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
    }
});
