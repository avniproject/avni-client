import PropTypes from 'prop-types';
import React from 'react';
import {Dimensions, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import Fonts from '../primitives/Fonts';
import AbstractComponent from "../../framework/view/AbstractComponent";
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";

const cardGap = 14;

class TitleNumberBlock extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string,
        number: PropTypes.number,
        highlight: PropTypes.bool,
    };

    // Callers that don't supply their own cardColor/textColor/numberColor (e.g. the family
    // folder screen) previously fell back to undefined, leaving a plain white square that only
    // had its elevation shadow to show for itself. Defaulting to the brand tile colours keeps
    // that look consistent with the rest of the tiles in the app.
    static defaultProps = {
        cardColor: Colors.BrandLight,
        textColor: Colors.BrandPrimaryDark,
        numberColor: Colors.BrandPrimaryDark,
    };

    static styles = StyleSheet.create({
        container: {
            borderRadius: 10,
            borderWidth: 1,
            justifyContent: 'center',
            padding: 10,
            minHeight: 64,
            marginTop: cardGap,
            // Two columns (matching CardTileView's width) instead of three - three-across left too
            // little room for longer labels ("Registrations"), forcing them onto extra wrapped
            // lines and inflating the tile's height unevenly.
            width: (Dimensions.get('window').width - (cardGap * 3)) / 2,
        },
        // Label-above-number, arrow pinned to the top-right of the row - matches CardTileView
        // (the richer tile style used on the custom dashboard) instead of the old bottom-right
        // chevron, so the two tile styles read as the same family across dashboards.
        row: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
        },
        titleStyle: {
            fontSize: 12,
        },
        numberStyle: {
            fontSize: 20,
            marginTop: 4,
        }
    });

    render() {
        const {textColor, numberColor, cardColor, title, onPress, number, index} = this.props;

        const textColorStyle = {color: textColor, opacity: 0.9};
        const numberColorStyle = {color: numberColor};
        return (
            <TouchableNativeFeedback onPress={() => onPress()}>
                <View
                    style={[TitleNumberBlock.styles.container, {
                        // Alternate left margin every other tile (2nd, 4th, ...) to match the
                        // 2-column grid - the old fixed "index 1 or 2" check assumed a 3-per-row
                        // layout and would misalign tiles once a row wrapped after 2 items.
                        marginLeft: index % 2 !== 0 ? cardGap : 0,
                        backgroundColor: cardColor,
                        borderColor: cardColor
                    }]}>
                    <View style={TitleNumberBlock.styles.row}>
                        <View style={{flex: 1}}>
                            <Text numberOfLines={1} ellipsizeMode="tail"
                                style={[TitleNumberBlock.styles.titleStyle, Fonts.typography("paperFontBody2"), textColorStyle]}>
                                {this.I18n.t(title)}
                            </Text>
                            <Text style={[Fonts.typography("paperFontBody2"), numberColorStyle, TitleNumberBlock.styles.numberStyle]}>
                                {number}
                            </Text>
                        </View>
                        <MCIcon name={'arrow-top-right'} size={18} color={numberColor} style={{opacity: 0.8, marginLeft: 4}}/>
                    </View>
                </View>
            </TouchableNativeFeedback>
        );
    }
}

export default TitleNumberBlock;
