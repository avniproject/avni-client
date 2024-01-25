import {ActivityIndicator, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import React from 'react';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import {CountResult} from "./CountResult";
import {get} from 'lodash';

export const CardListView = ({reportCard, I18n, onCardPress, countResult}) => {
    const {name, colour, itemKey} = reportCard;
    const cardName = (countResult && countResult.cardName) || name;
    const textColor = (countResult && countResult.textColor) || '#ffffff';
    const cardColor = (countResult && countResult.cardColor) || colour || '#0000ff';

    const renderNumber = (textColor) => {
        return (_.isNil(get(countResult, 'primaryValue')) ?
                <ActivityIndicator size="large" color={textColor} style={{paddingVertical: 25}}/> :
                <CountResult
                    direction={'column'}
                    primary={countResult.primaryValue}
                    secondary={countResult.secondaryValue}
                    primaryStyle={[styles.primaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardPrimaryTextErrorStyle]}
                    secondaryStyle={[styles.secondaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardSecondaryTextErrorStyle]}
                />
        )
    };

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(itemKey)} disabled={!get(countResult, 'clickable')}>
            <View key={itemKey} style={styles.container}>
                <View style={styles.rowContainer}>
                    <View style={styles.nameContainer}>
                        <Text style={styles.nameTextStyle}>{I18n.t(cardName)}</Text>
                    </View>
                    <View style={[styles.numberContainer, {backgroundColor: cardColor}]}>
                        <View style={{alignSelf: 'center'}}>
                            {renderNumber(textColor)}
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
    primaryTextStyle: {
        fontSize: 30,
        fontWeight: 'bold'
    },
    secondaryTextStyle: {
        fontSize: 23,
        fontStyle: 'normal',
    },
    cardPrimaryTextErrorStyle: {
        fontSize: 11,
        fontStyle: 'normal',
    },
    cardSecondaryTextErrorStyle: {
        fontSize: 9,
        fontStyle: 'normal',
    }
});
