import {ActivityIndicator, Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import React from 'react';
import {CountResult} from "./CountResult";
import {get} from "lodash";

export const CardTileView = ({index, reportCard, I18n, onCardPress, countResult}) => {

    const {name, uuid} = reportCard;
    const cardGap = 16;
    const cardWidth = (Dimensions.get('window').width - cardGap * 3) / 2;
    const textColor = reportCard.textColor;
    const cardColor = reportCard.cardColor || '#ffffff';
    const iconName = reportCard.iconName;

    const renderIcon = () => {
        return (
            <View style={styles.iconContainer}>
                <Icon name={iconName} size={30} color={textColor} style={{opacity: 0.8}}/>
            </View>
        )
    };

    const renderNumber = () => {
        return (_.isNil(get(countResult, 'primaryValue')) ?
                <ActivityIndicator size="small" color={textColor}/> :
                <CountResult
                    direction={'row'}
                    primary={countResult.primaryValue}
                    secondary={countResult.secondaryValue}
                    primaryStyle={[styles.cardPrimaryTextStyle, {color: textColor}]}
                    secondaryStyle={[styles.cardSecondaryTextStyle, {color: textColor}]}
                />
        )
    };

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(uuid)} disabled={!get(countResult, 'clickable')}>
            <View key={uuid}
                  style={[styles.container, {
                      marginTop: cardGap,
                      marginLeft: index % 2 !== 0 ? cardGap : 0,
                      width: cardWidth,
                      backgroundColor: cardColor
                  }]}>
                <View style={{flexDirection: 'row'}}>
                    <View style={styles.leftContainer}>
                        <View style={{height: 20, marginBottom: 10}}>
                            {renderNumber()}
                        </View>
                        <Text style={[styles.cardNameTextStyle, {color: textColor}]}>{I18n.t(name)}</Text>
                    </View>
                    {iconName && renderIcon()}
                </View>
            </View>
        </TouchableNativeFeedback>
    )
};

const styles = StyleSheet.create({
    container: {
        height: 80,
        borderRadius: 8,
        elevation: 2,
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 20
    },
    leftContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        flex: 1
    },
    cardNameTextStyle: {
        fontSize: 12,
        fontStyle: 'normal'
    },
    cardPrimaryTextStyle: {
        fontSize: 19,
        fontStyle: 'normal',
    },
    cardSecondaryTextStyle: {
        fontSize: 16,
        fontStyle: 'normal',
    },
    iconContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        flex: 1
    }
});
