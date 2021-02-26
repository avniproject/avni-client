import {ActivityIndicator, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import React from 'react';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

export const CardListView = ({reportCard, I18n, onCardPress}) => {
    const {name, colour, uuid} = reportCard;

    const renderNumber = () => {
        const count = reportCard.count;
        return (_.isNil(count) ?
                <ActivityIndicator size="large" color="#0000ff" style={{paddingVertical: 25}}/> :
                <Text style={styles.countTextStyle}>{count}</Text>
        )
    };

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(uuid)}>
            <View key={uuid} style={styles.container}>
                <View style={styles.rowContainer}>
                    <View style={styles.nameContainer}>
                        <Text style={styles.nameTextStyle}>{I18n.t(name)}</Text>
                    </View>
                    <View style={[styles.numberContainer, {backgroundColor: colour}]}>
                        <View style={{alignSelf: 'center'}}>
                            {renderNumber()}
                        </View>
                    </View>
                </View>
            </View>
        </TouchableNativeFeedback>
    )
};

const styles = StyleSheet.create({
    container: {
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 3,
        marginHorizontal: 3,
    },
    rowContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        height: 100,
    },
    NameContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        height: 100,
    },
    nameContainer: {
        paddingHorizontal: 10,
        width: '75%',
        alignSelf: 'center'
    },
    nameTextStyle: {
        fontSize: Styles.normalTextSize
    },
    numberContainer: {
        width: '25%',
        paddingVertical: 1
    },
    countTextStyle: {
        paddingVertical: 25,
        fontSize: 30,
        fontWeight: 'bold'
    }
});
