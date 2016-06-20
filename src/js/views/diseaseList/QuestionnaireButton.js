import React, { Component, StyleSheet, Text } from 'react-native';
import TypedTransition from '../../routing/TypedTransition';
import QuestionAnswerView from './../questionAnswer/QuestionAnswerView';
import AppState from "../../hack/AppState";
import I18n from '../../utility/Messages'


class QuestionnaireButton extends Component {

    static propTypes = {
        diseaseName: React.PropTypes.string.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        item: {
            backgroundColor: '#FF3823',
            color: '#FFFFFF',
            margin: 10,
            width: 150,
            height: 100,
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontSize: 23
        }
    });

    onSelect = () => {
        AppState.createNewQuestionnaire(this.props.diseaseName);
        TypedTransition
            .from(this)
            .with({
                questionNumber: 0
            })
            .to(QuestionAnswerView);
    };

    render() {
        return (
            <Text onPress={this.onSelect} style={QuestionnaireButton.styles.item}>
                {I18n.t(this.props.diseaseName)}
            </Text>
        );
    }
}

export default QuestionnaireButton;