import Path from '../routing/Path'
import React, {Component, View, Text} from 'react-native'

@Path('/errorView')
class ErrorView extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    render() {
        return (<View>
            {this.renderErrors()}
        </View>);
    }

    renderErrors() {
        return this.props.params.errors.map((error) => {
            return <Text>{error}</Text>
        });
    }
}

export default ErrorView;