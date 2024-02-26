import React from "react";
import PropTypes from 'prop-types';
import AbstractFormElement from "./AbstractFormElement";
import {View} from "react-native";
import ValidationErrorMessage from "../ValidationErrorMessage";
import _ from "lodash";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import LocationHierarchyInput from "../inputComponents/LocationHierarchyInput";

class LocationHierarchyFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object
    };

    onSelect(lowestSelectedAddresses) {
        const addressLevel = _.head(lowestSelectedAddresses);
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            value: addressLevel ? addressLevel.uuid : null
        });
    }

    render() {
        return (
            <View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                <LocationHierarchyInput concept={this.props.element.concept} mandatory={this.props.element.mandatory} value={this.props.value} onSelect={(selectedAddresses) => this.onSelect(selectedAddresses)}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>)
    }
}

export default LocationHierarchyFormElement;
