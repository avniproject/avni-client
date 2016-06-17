import React, {Component, StyleSheet, Text, View, TouchableHighlight, Navigator} from 'react-native';
import TypedTransition from "../../routing/TypedTransition";
import * as CHSStyles from "./GlobalStyles";

class WizardButtons extends Component {
    static propTypes = {
        hasQuestionBefore: React.PropTypes.bool.isRequired,
        nextParams: React.PropTypes.object.isRequired,
        parent: React.PropTypes.object.isRequired,
        nextView: React.PropTypes.func.isRequired
    };

    previousButton() {
        var dynamicStyle = this.props.hasQuestionBefore ? CHSStyles.Global.navButtonVisible : CHSStyles.Global.navButtonHidden;
        return (
            <Text onPress={this.onPrevious} style={[CHSStyles.Global.navButton, dynamicStyle]}>Previous</Text>);
    };

    onPrevious = () => {
        TypedTransition.from(this.props.parent).goBack();
    };

    onNext = () => {
        var typedTransition = TypedTransition.from(this.props.parent);
        typedTransition.with(this.props.nextParams).to(this.props.nextView);
    };

    render() {
        return (
            <View>
                <View
                    style={{flexDirection: 'row', height: 100, width: 600, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                    {this.previousButton()}
                    <Text onPress={this.onNext}
                          style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>Next</Text>
                </View>
            </View>
        );
    }
}

export default WizardButtons;