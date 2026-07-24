import {ActivityIndicator, Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import React from 'react';
import _, {get} from 'lodash';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../primitives/Colors';
import Styles from '../primitives/Styles';

const renderIcon = function (iconName, textColor) {
    return (
        <View style={styles.iconContainer}>
            <Icon name={iconName} size={30} color={textColor} style={{opacity: 0.8}}/>
        </View>
    );
};

const renderNumber = function (countResult = {}, textColor) {
    if ((_.isNil(get(countResult, 'primaryValue')))) {
        return <ActivityIndicator size="small" color={textColor} style={{marginTop: 8, alignSelf: 'flex-start'}}/>;
    }
    const primaryStyle = [styles.cardPrimaryTextStyle, {color: textColor, marginTop: 2}, countResult.hasErrorMsg && styles.cardPrimaryTextErrorStyle];
    const secondaryStyle = [styles.cardSecondaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardSecondaryTextErrorStyle];
    const {primaryValue, secondaryValue} = countResult;

    return (
        <View>
            <Text style={primaryStyle}>{primaryValue}</Text>
            {secondaryValue ? <Text style={[secondaryStyle, {marginTop: 2}]}>{secondaryValue}</Text> : null}
        </View>
    );
};

const cardGap = 14;

export const CardTileView = ({index, reportCard, I18n, onCardPress, countResult}) => {
    const {name, itemKey, iconName, colour} = reportCard;
    const cardWidth = (Dimensions.get('window').width - cardGap * 3) / 2;
    const cardName = (countResult && countResult.cardName) || name;
    // Tile background colour is server-configured (reportCard.colour / countResult.cardColor)
    // so each tile can carry its own colour again; '#DAF3F4' was a temporary flat Figma colour.
    // const cardColor = '#DAF3F4';
    const cardColor = (countResult && countResult.cardColor) || colour || '#DAF3F4';
    const textColor = Colors.BrandPrimaryDark;
    const descriptionColor = Colors.BrandPrimaryDark;
    const clickable = get(countResult, 'clickable');
    const cardBorderColor = cardColor;

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(itemKey)} disabled={!clickable}>
            <View key={itemKey}
                  style={[styles.container, {
                      marginTop: cardGap,
                      marginLeft: index % 2 !== 0 ? cardGap : 0,
                      width: cardWidth,
                      minHeight: 64,
                      backgroundColor: cardColor,
                      borderColor: cardBorderColor,
                      borderWidth: 1,
                      padding: 8,
                  }]}>
                <View style={styles.cardNameContainerStyle}>
                    <View style={{flex: 1}}>
                        <Text style={[styles.cardNameTextStyle, {color: descriptionColor}]}>{I18n.t(cardName)}</Text>
                        {renderNumber(countResult, textColor)}
                    </View>
                    {iconName && renderIcon(iconName, textColor)}
                    {clickable && <MCIcon name={'arrow-top-right'} size={20} color={textColor} style={{marginLeft: 8}}/>}
                </View>
            </View>
        </TouchableNativeFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
    },
    cardNameTextStyle: {
        fontSize: Styles.smallerTextSize,
        fontStyle: 'normal'
    },
    cardNameContainerStyle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
    },
    cardPrimaryTextStyle: {
        fontSize: 22,
        fontWeight: '400',
        fontStyle: 'normal',
    },
    cardSecondaryTextStyle: {
        fontSize: 14,
        fontStyle: 'normal',
    },
    iconContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginLeft: 8
    },
    cardPrimaryTextErrorStyle: {
        fontSize: 11,
        fontStyle: 'normal',
    },
    cardSecondaryTextErrorStyle: {
        fontSize: 8,
        fontStyle: 'normal',
    }
});
