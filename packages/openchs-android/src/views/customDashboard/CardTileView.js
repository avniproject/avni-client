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
        return <ActivityIndicator size="small" color={textColor}/>;
    }
    const primaryStyle = [styles.cardPrimaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardPrimaryTextErrorStyle, {marginTop: -20}];
    const secondaryStyle = [styles.cardSecondaryTextStyle, {color: textColor}, countResult.hasErrorMsg && styles.cardSecondaryTextErrorStyle];
    const {primaryValue, secondaryValue} = countResult;

    return (
        <View>
            <View style={{alignItems: 'flex-end', paddingTop: 10, minHeight: 40}}>
                {secondaryValue ?
                    <Text style={[secondaryStyle, {marginRight: 8}]}>
                        {secondaryValue}
                    </Text> :
                    null}
            </View>
            <Text style={primaryStyle}>{primaryValue}</Text>
        </View>
    );
};

const cardGap = 14;

export const CardTileView = ({index, reportCard, I18n, onCardPress, countResult}) => {
    const {name, colour, itemKey, iconName} = reportCard;
    const cardWidth = (Dimensions.get('window').width - cardGap * 3) / 2;
    const cardName = (countResult && countResult.cardName) || name;
    const textColor = (countResult && countResult.textColor) || Styles.blackColor;
    const descriptionColor = (countResult && countResult.textColor) || Styles.blackColor;
    const cardColor = (countResult && countResult.cardColor) || colour || '#999999';
    const clickable = get(countResult, 'clickable');
    const chevronColor = Colors.darker(0.1, cardColor);
    const cardBorderColor = Colors.darker(0.2, cardColor);

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(itemKey)} disabled={!clickable}>
            <View key={itemKey}
                  style={[styles.container, {
                      marginTop: cardGap,
                      marginLeft: index % 2 !== 0 ? cardGap : 0,
                      width: cardWidth,
                      minHeight: 100,
                      backgroundColor: cardColor,
                      borderColor: cardBorderColor,
                      borderWidth: 1,
                      paddingLeft: 16,
                  }]}>
                <View style={styles.cardNameContainerStyle}>
                    <View>
                        {renderNumber(countResult, textColor)}
                        <Text style={[styles.cardNameTextStyle, {color: descriptionColor}]}>{I18n.t(cardName)}</Text>
                    </View>
                    <View>
                        {iconName && renderIcon(iconName, textColor)}
                    </View>
                </View>
                <View style={{position: 'absolute', right: 0, bottom: 0, height: 20, width: 20}}>
                    <View style={{
                        backgroundColor: chevronColor,
                        borderTopLeftRadius: 4, borderBottomRightRadius: 4,
                        height: 20, width: 20, alignItems: 'center', justifyContent: 'center'
                    }}>
                        {clickable &&
                            <MCIcon name={'chevron-right'} size={20} color={textColor} style={{opacity: 0.8}}/>}
                    </View>
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
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal'
    },
    cardNameContainerStyle: {
        paddingBottom: 20,
        marginRight: 12
    },
    cardPrimaryTextStyle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'normal',
    },
    cardSecondaryTextStyle: {
        fontSize: 14,
        fontStyle: 'normal',
    },
    iconContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        flex: 1
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
