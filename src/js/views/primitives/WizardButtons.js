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
                <View style={CHSStyles.Global.actionButtonWrapper}>
                    <Text onPress={this.onPrevious}
                          style={[CHSStyles.Global.actionButton, dynamicStyle]}>{I18n.t("previous")}</Text>
                </View>
            </TouchableHighlight>);
    };

    onPrevious = () => {
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
        var typedTransition = TypedTransition.from(this.props.parent);
        typedTransition.with(this.props.nextParams).to(this.props.nextView);
    };

    render() {
        return (
            <View
                style={{flexDirection: 'row', height: 50, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                {this.previousButton()}
                <TouchableHighlight>
                    <View style={CHSStyles.Global.actionButtonWrapper}>
                        <Text onPress={this.onNext}
                              style={[CHSStyles.Global.actionButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("next")}</Text>
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
}

export default WizardButtons;