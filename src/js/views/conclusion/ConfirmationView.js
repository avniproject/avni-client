import React, {Component, View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import TypedTransition from "../../routing/TypedTransition";
import * as CHSStyles from "../primitives/GlobalStyles";
import AppHeader from '../primitives/AppHeader';
import Path from "../../routing/Path";
import AppState from '../../hack/AppState';
import I18n from '../../utility/Messages';
import DecisionSupportSessionView from './DecisionSupportSessionView';

@Path('/ConfirmationView')
class ConfirmationView extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    onRestart = () => {
        TypedTransition.from(this).toBeginning();
    };

    onSaveAndRestart = () => {
        var service = this.context.getService("decisionSupportSessionService");
        service.save(AppState.questionnaireAnswers, this.props.params.decisions);
        TypedTransition.from(this).toBeginning();
    };
    
    render() {
        return (
            <View>
                <AppHeader title="confirmation"
                           parent={this}
                />
                <DecisionSupportSessionView decision={this.props.params.decisions[0]}/>
                <View
                    style={{flexDirection: 'row', height: 100, width: 600, justifyContent: 'flex-end', marginTop: 30, paddingRight: 20}}>
                    <Text onPress={this.onRestart}
                          style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("restart")}</Text>
                    <Text onPress={this.onSaveAndRestart}
                          style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("saveAndRestart")}</Text>
                </View>
            </View>
        );
    }
}

export default ConfirmationView;