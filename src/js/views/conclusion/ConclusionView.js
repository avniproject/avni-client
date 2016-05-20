import React, {Component, View, Text} from 'react-native';
import Path from '../../routing/Path';
import AppState from '../../hack/AppState'
import * as ConclusionFunctions from '../../../config/conclusions'

@Path('/conclusion')
class ConclusionView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        var conclusionFunctionName = AppState.questionnaireAnswers.questionnaireName.replace(/\s/g, "_") + "_conclusion";
        console.log("Function name for deriving conclusion: " + conclusionFunctionName);
        var parameter = AppState.questionnaireAnswers;
        var output = eval(`ConclusionFunctions.${conclusionFunctionName}(parameter)`);
        return (
            <View>
                <Text>{output}</Text>
            </View>
        );
    }
}

export default ConclusionView;