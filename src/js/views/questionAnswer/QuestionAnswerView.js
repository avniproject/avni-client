import React, {Component, View} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import Answer from './Answer.js';

@Path('/questionAnswer')
class QuestionAnswerView extends Component {

    static propTypes = {
        params: React.PropTypes.object.isRequired,
        question: React.PropTypes.string
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.diseaseService = this.context.getService("diseaseService");
        this.state = {
            flow: this.diseaseService.diseases.get("stroke"),
        };
    }

    render() {
        return (
            <View>
                <Question question={this.state.flow.question}/>
                <Answer answer={this.state.flow.answer}/>
            </View>
        );
    }
}

export default QuestionAnswerView;
