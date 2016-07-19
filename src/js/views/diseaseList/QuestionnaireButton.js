import  {StyleSheet, Text, TouchableHighlight, View} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from '../../framework/routing/TypedTransition';
import QuestionAnswerView from './../questionAnswer/QuestionAnswerView';
import AppState from "../../hack/AppState";
import I18n from '../../utility/Messages'

class QuestionnaireButton extends Component {
    static propTypes = {
        questionnaire: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        itemWrapper: {
            flex: 1,
            borderRadius: 3,
            backgroundColor: '#e93a2c',
            width: 150,
            height: 100,
            margin: 5
        },
        item: {
            color: '#FFFFFF',
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            fontSize: 23
        }
    });

    onSelect = () => {
        var questionnaire = this.questionnaireFactory.make(this.props.questionnaire);
        AppState.startQuestionnaireSession(questionnaire);
        TypedTransition
            .from(this)
            .with({
                questionNumber: 0,
                questionnaire: questionnaire
            })
            .to(QuestionAnswerView);
    };

    render() {
        return (
            <TouchableHighlight>
                <View style={QuestionnaireButton.styles.itemWrapper}>
                    <Text onPress={this.onSelect} style={[QuestionnaireButton.styles.item, {flex: 1}]}>
                        {I18n.t(this.props.questionnaire.name)}
                    </Text>
                </View>
            </TouchableHighlight>
        );
    }
}

export default QuestionnaireButton;