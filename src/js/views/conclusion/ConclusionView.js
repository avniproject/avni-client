import React, {Component, View, Text} from 'react-native';
import Path from '../../routing/Path';
import AppState from '../../hack/AppState'

@Path('/conclusion')
class ConclusionView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View>
                <Text>{JSON.stringify(AppState.conclusion)}</Text>
            </View>
        );
    }
}

export default ConclusionView;