import {ActivityIndicator, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import React from 'react';
import Styles from '../primitives/Styles';
import {CountResult} from './CountResult';
import _, {get} from 'lodash';
import Colors from '../primitives/Colors';

export const CardListView = ({reportCard, I18n, onCardPress, countResult, index, isLastCard}) => {
    const {name, colour, itemKey} = reportCard;
    const cardName = (countResult && countResult.cardName) || name;
    const textColor = (countResult && countResult.textColor) || Styles.blackColor;
    const descriptionColor = (countResult && countResult.textColor) || Styles.blackColor;
    const cardColor = (countResult && countResult.cardColor) || colour || '#999999';
    const chevronColor = Colors.darker(0.1, cardColor);
    const clickable = get(countResult, 'clickable');

    const renderNumber = () => {
        return (_.isNil(get(countResult, 'primaryValue')) ?
                <ActivityIndicator size="large" color={textColor} style={{paddingVertical: 25}}/> :
                <CountResult
                    direction={'column'}
                    primary={countResult.primaryValue}
                    secondary={countResult.secondaryValue}
                    primaryStyle={[styles.primaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardPrimaryTextErrorStyle]}
                    secondaryStyle={[styles.secondaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardSecondaryTextErrorStyle]}
                    clickable={clickable}
                    chevronColor={chevronColor}
                    colour={textColor}
                />
        );
    };

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(itemKey)} disabled={!clickable}>
            <View
                style={[styles.rowContainer, {backgroundColor: cardColor}, index === 0 ? styles.firstRowContainer : {},
                    isLastCard ? styles.lastRowContainer : {}
                ]}>
                <View style={styles.nameContainer}>
                    <Text style={[styles.nameTextStyle, {color: descriptionColor}]}>{I18n.t(cardName)}</Text>
                </View>
                <View style={[styles.numberContainer]}>
                    {renderNumber()}
                </View>
            </View>
        </TouchableNativeFeedback>
    );
};

const styles = StyleSheet.create({
    rowContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        height: 100,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#DCDCDC'
    },
    firstRowContainer: {
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10
    },
    lastRowContainer: {
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10
    },
    NameContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        height: 100,
    },
    nameContainer: {
        marginLeft: 5,
        paddingHorizontal: 3,
        flex: 0.7,
        flexDirection: 'row',
        paddingLeft: 16,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderColor: '#DCDCDC'
    },
    nameTextStyle: {
        paddingTop: 15,
        fontSize: Styles.titleSize,
        width: '90%'
    },
    numberContainer: {
        flex: 0.3,
        paddingVertical: 1
    },
    primaryTextStyle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'normal',
    },
    secondaryTextStyle: {
        fontSize: 16,
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
