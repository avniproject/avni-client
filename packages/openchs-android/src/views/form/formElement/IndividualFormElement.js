import PropTypes from 'prop-types';
import {Text, TouchableOpacity, View} from 'react-native';
import React from 'react';
import Styles from "../../primitives/Styles";
import Distances from "../../primitives/Distances";
import AbstractFormElement from "./AbstractFormElement";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import TypedTransition from "../../../framework/routing/TypedTransition";
import IndividualSearchView from "../../../views/individual/IndividualSearchView"
import ValidationErrorMessage from "../../form/ValidationErrorMessage";


class IndividualFormElement extends AbstractFormElement {
    static propTypes = {
        individualNameValue: PropTypes.string,
        inputChangeActionName: PropTypes.string.isRequired,
        validationResult: PropTypes.object,
        searchHeaderMessage: PropTypes.string.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 36};

    search(){
        TypedTransition.from(this).bookmark().with(
            {
            showHeader: true, headerMessage : this.props.searchHeaderMessage,
            onIndividualSelection : (source, individual) => {
                TypedTransition.from(source).popToBookmark();
                this.dispatchAction(this.props.inputChangeActionName, {formElement: this.props.element, value: individual});
            }}).to(IndividualSearchView, true);

    }

    render() {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                {this.label}
                <View style={{flexDirection: 'row'}}>
                <Text style={[{
                    flex: 1,
                    marginVertical: 0,
                    paddingVertical: 5
                }, Styles.formBodyText]}>{this.props.individualNameValue}</Text>
                <TouchableOpacity activeOpacity={0.5} onPress={this.search.bind(this)} transparent>
                    <Icon name="magnify" style={IndividualFormElement.iconStyle}/>
                </TouchableOpacity>
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>);
    }
}

export default IndividualFormElement;