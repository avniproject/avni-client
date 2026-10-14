import React from "react";
import {View} from "react-native";
import {Text} from "native-base";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AbstractFormElement from "./AbstractFormElement";
import SelectFormElement from "./SelectFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import Distances from "../../primitives/Distances";

class MultiSelectFormElement extends AbstractFormElement {

    // Any read-only (editable: false) multi-select reads as a fixed set of already-chosen values -
    // a single talking-points/checklist-style card is a clearer presentation of that everywhere
    // than a row of disabled answer pills, which look like inactive controls rather than a
    // static result. Structural (any disabled multi-select), not tied to one field/form.
    get isChecklistCard() {
        return this.isReadOnly;
    }

    renderChecklistCard() {
        const selectedAnswers = this.props.element.getAnswers()
            .filter(answer => this.props.multipleCodeValues.isAnswerAlreadyPresent(answer.concept.uuid));
        return (
            <View style={{
                flexDirection: 'column',
                paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems + 16,
                // Matches the divider every other field in the form gets from SelectFormElement's
                // own wrapper - lost here since this field renders its own layout instead of
                // going through that component.
                borderBottomWidth: this.props.hideBottomBorder ? 0 : 1,
                borderBottomColor: Colors.InputBorderNormal
            }}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {selectedAnswers.length === 0 ? this.showEmptyReadOnly() :
                    <View style={{
                        backgroundColor: Colors.SectionHeaderBackground,
                        borderRadius: 8,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: Colors.BrandPrimaryDark
                    }}>
                        {selectedAnswers.map((answer, index) =>
                            <View key={answer.concept.uuid}
                                  style={{flexDirection: 'row', alignItems: 'flex-start', marginTop: index > 0 ? 12 : 0}}>
                                <Icon name="check" size={18} color={Colors.BrandPrimaryDark} style={{marginTop: 2, marginRight: 8}}/>
                                <Text style={[Styles.formBodyText, {
                                    color: Colors.BrandPrimaryDark,
                                    fontSize: 16,
                                    flex: 1
                                }]}>
                                    {this.I18n.t(answer.concept.name)}
                                </Text>
                            </View>
                        )}
                    </View>}
            </View>
        );
    }

    render() {
        if (this.isChecklistCard) {
            return this.renderChecklistCard();
        }
        return (
            <SelectFormElement multiSelect={true}
                               isSelected={(answer) => this.props.multipleCodeValues.isAnswerAlreadyPresent(answer)}
                               {...this.props}/>);
    }

}

export default MultiSelectFormElement;
