import React, {Component, View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import AppHeader from '../primitives/AppHeader';
import DecisionSupportSessionControl from './DecisionSupportSessionComponent';
import Path from "../../routing/Path";

@Path('/DecisionSupportSessionView')
class DecisionSupportSessionView extends Component {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    render() {
        const session = this.props.params.session;
        return (
            <View>
                <AppHeader parent={this} title="session"/>
                <DecisionSupportSessionControl questionAnswers={session.questionAnswers} decision={session.decisions[0]}/>
            </View>
        );
    }
}

export default DecisionSupportSessionView;