import {StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import * as CHSStyles from "./GlobalStyles";
import I18n from '../../utility/Messages';

class WizardButtons extends Component {
    static propTypes = {
        hasQuestionBefore: React.PropTypes.bool.isRequired,
        nextParams: React.PropTypes.object.isRequired,
        parent: React.PropTypes.object.isRequired,
        nextView: React.PropTypes.func.isRequired,
        validationFn: React.PropTypes.func
    };

    previousButton() {
        var dynamicStyle = this.props.hasQuestionBefore ? CHSStyles.Global.navButtonVisible : CHSStyles.Global.navButtonHidden;
        return (
            <TouchableHighlight>
                <Text onPress={this.onPrevious}
                      style={[CHSStyles.Global.navButton, dynamicStyle]}>{I18n.t("previous")}</Text>
            </TouchableHighlight>);
    };

    onPrevious = () => {
        require('dismissKeyboard')();
        TypedTransition.from(this.props.parent).goBack();
    };

    onNext = () => {
        if (this.props.validationFn !== undefined) {
            var validationResult = this.props.validationFn();
            if (!validationResult.status) {
                Alert.alert(I18n.t("validationError"), validationResult.message,
                    [
                        {
                            text: 'OK', onPress: () => {
                        }
                        }
                    ]
                );
                return;
            }
        }
        require('dismissKeyboard')();
        var typedTransition = TypedTransition.from(this.props.parent);
        typedTransition.with(this.props.nextParams).to(this.props.nextView);
    };

    render() {
        return (
            <View
                style={{flexDirection: 'row', height: 100, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                {this.previousButton()}
                <TouchableHighlight>
                    <Text onPress={this.onNext}
                          style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("next")}</Text>
                </TouchableHighlight>
            </View>
        );
    }
}

export default WizardButtons;