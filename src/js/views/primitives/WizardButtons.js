import React, {Component, StyleSheet, Text, View, TouchableHighlight, Navigator, Alert} from 'react-native';
import TypedTransition from "../../routing/TypedTransition";
import * as CHSStyles from "./GlobalStyles";
import I18n from '../../utility/Messages';
import AppState from '../../hack/AppState';

class WizardButtons extends Component {
    static propTypes = {
        hasQuestionBefore: React.PropTypes.bool.isRequired,
        nextParams: React.PropTypes.object.isRequired,
        parent: React.PropTypes.object.isRequired,
        nextView: React.PropTypes.func.isRequired,
        isMandatory: React.PropTypes.bool.isRequired
    };

    previousButton() {
        var dynamicStyle = this.props.hasQuestionBefore ? CHSStyles.Global.navButtonVisible : CHSStyles.Global.navButtonHidden;
        return (
            <Text onPress={this.onPrevious}
                  style={[CHSStyles.Global.navButton, dynamicStyle]}>{I18n.t("previous")}</Text>);
    };

    onPrevious = () => {
        TypedTransition.from(this.props.parent).goBack();
    };

    onNext = () => {
        if (AppState.questionnaireAnswers.currentAnswerIsEmpty && this.props.isMandatory)
            Alert.alert(
                'This field is mandatory',
                'There is no value specified',
                [
                    {
                        text: 'OK', onPress: () => {}
                    }
                ]
            );
        else {
            var typedTransition = TypedTransition.from(this.props.parent);
            typedTransition.with(this.props.nextParams).to(this.props.nextView);
        }
    };

    render() {
        return (
            <View>
                <View
                    style={{flexDirection: 'row', height: 100, width: 600, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                    {this.previousButton()}
                    <Text onPress={this.onNext}
                          style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("next")}</Text>
                </View>
            </View>
        );
    }
}

export default WizardButtons;