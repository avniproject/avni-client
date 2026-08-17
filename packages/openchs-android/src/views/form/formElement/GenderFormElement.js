import PropTypes from 'prop-types';
import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import AbstractDataEntryState from "../../../state/AbstractDataEntryState";
import Distances from "../../primitives/Distances";
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import {Individual} from 'avni-models';
import {Actions} from "../../../action/individual/PersonRegisterActions";
import ValidationErrorMessage from "../ValidationErrorMessage";

class GenderFormElement extends AbstractComponent {
    static propTypes = {
        state: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {genders, individual} = this.props.state;
        const validationResult = AbstractDataEntryState.getValidationError(this.props.state, Individual.validationKeys.GENDER);

        return (
            <View style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}>
                <Text style={Styles.formLabel}>{this.I18n.t('gender')}<Text style={{color: Colors.ValidationError}}> * </Text></Text>
                <View style={styles.segmentedControl}>
                    {genders.map((gender) => {
                        const selected = gender.equals(individual.gender);
                        return (
                            <TouchableOpacity key={gender.name}
                                              activeOpacity={0.7}
                                              style={[styles.segment, selected && styles.segmentSelected]}
                                              onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: gender})}>
                                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{this.I18n.t(gender.name)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <ValidationErrorMessage validationResult={validationResult}/>
            </View>
        );
    }
}

export default GenderFormElement;

const styles = StyleSheet.create({
    segmentedControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        padding: 8,
        backgroundColor: Colors.WhiteContentBackground
    },
    segment: {
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    segmentSelected: {
        backgroundColor: Colors.BrandPrimary
    },
    segmentText: {
        fontSize: Styles.normalTextSize,
        color: Colors.TextPrimaryDark
    },
    segmentTextSelected: {
        color: Colors.TextOnPrimaryColor
    }
});
