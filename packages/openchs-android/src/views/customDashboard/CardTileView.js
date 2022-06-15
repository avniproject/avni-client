import {ActivityIndicator, Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import React from 'react';

export const CardTileView = ({index, reportCard, I18n, onCardPress}) => {

    const {name, uuid, count} = reportCard;
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
        return (_.isNil(count) ?
                <ActivityIndicator size="small" color={textColor}/> :
                <Text style={[styles.cardCountTextStyle, {color: textColor}]}>{count}</Text>
        )
    };

    return (
        <TouchableNativeFeedback onPress={() => onCardPress(uuid)}>
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
    cardCountTextStyle: {
        fontSize: 19,
        fontStyle: 'normal',
    },
    iconContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        flex: 1
    }
});
