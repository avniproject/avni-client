import PropTypes from 'prop-types';
import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Colors from "./Colors";
import Styles from "./Styles";
import ValidationErrorMessage from "../form/ValidationErrorMessage";

/**
 * Horizontal segmented control for a short single-select question, styled like the Gender
 * selector on the registration screen (GenderFormElement): one bordered row, the selected option
 * filled with the brand colour. Used by SelectFormElement when a question opts in via the
 * `displayAsSegmented` key-value (e.g. HbA1c "Device run" / "Manual run").
 */
class SegmentedOptions extends React.Component {
    static propTypes = {
        labelValuePairs: PropTypes.array.isRequired,
        selectionFn: PropTypes.func.isRequired,
        onPress: PropTypes.func.isRequired,
        I18n: PropTypes.object.isRequired,
        labelKey: PropTypes.string,
        validationError: PropTypes.object
    };

    render() {
        const {labelValuePairs, selectionFn, onPress, I18n, labelKey, validationError} = this.props;
        return (
            <View>
                <View accessibilityLabel={labelKey} style={styles.segmentedControl}>
                    {labelValuePairs.map((rlv) => {
                        const selected = selectionFn(rlv.value) || false;
                        return (
                            <TouchableOpacity key={rlv.value}
                                              activeOpacity={0.7}
                                              accessibilityRole="radio"
                                              accessibilityState={{selected}}
                                              style={[styles.segment, selected && styles.segmentSelected]}
                                              onPress={() => onPress(rlv.value, rlv.label)}>
                                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}
                                      numberOfLines={1}>{I18n.t(rlv.label)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <ValidationErrorMessage validationResult={validationError}/>
            </View>
        );
    }
}

export default SegmentedOptions;

const styles = StyleSheet.create({
    segmentedControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        padding: 8,
        backgroundColor: Colors.WhiteContentBackground
    },
    segment: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    segmentSelected: {
        backgroundColor: Colors.BrandPrimaryDark
    },
    segmentText: {
        fontSize: Styles.normalTextSize,
        color: Colors.TextPrimaryDark
    },
    segmentTextSelected: {
        color: Colors.TextOnPrimaryColor
    }
});
