import {Text, View, TouchableOpacity} from 'react-native';
import React from 'react';
import Styles from "../../primitives/Styles";
import Distances from "../../primitives/Distances";
import AbstractFormElement from "./AbstractFormElement";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import CHSNavigator from "../../../utility/CHSNavigator";
import TypedTransition from "../../../framework/routing/TypedTransition";
import IndividualSearchView from "../../../views/individual/IndividualSearchView"
import ValidationErrorMessage from "../../form/ValidationErrorMessage";


class IndividualNameFormElement extends AbstractFormElement {
    static propTypes = {
        individualNameValue: React.PropTypes.string,
        inputChangeActionName: React.PropTypes.string.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 36};

    register(){
        CHSNavigator.navigateToIndividualRegisterView(this);
    }

    search(){
        TypedTransition.from(this).bookmark().with(
            {
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
                    <Icon name="magnify" style={IndividualNameFormElement.iconStyle}/>
                </TouchableOpacity>
                <TouchableOpacity disabled={true} activeOpacity={0.5} onPress={this.register.bind(this)} transparent>
                    <Icon name="account-plus" style={IndividualNameFormElement.iconStyle}/>
                </TouchableOpacity>
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>);
    }
}

export default IndividualNameFormElement;