import {View, ListView, Text, StyleSheet, TouchableOpacity, TouchableHighlight} from 'react-native';
import React, {Component} from 'react';
import TypedTransition from "../../framework/routing/TypedTransition";
import * as CHSStyles from "../primitives/GlobalStyles";
import AppHeader from '../primitives/AppHeader';
import Path from "../../framework/routing/Path";
import AppState from '../../hack/AppState';
import I18n from '../../utility/Messages';
import DecisionSupportSessionComponent from './DecisionSupportSessionComponent';
import DiseaseListView from "../diseaseList/DiseaseListView";

@Path('/ConfirmationView')
class ConfirmationView extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    onSaveAndRestart = () => {
        var service = this.context.getService("decisionSupportSessionService");
        service.save(AppState.questionnaireAnswers, this.props.params.decisions);
        TypedTransition.from(this).resetTo(DiseaseListView);
    };

    onPrevious = () => {
        TypedTransition.from(this).goBack();
    };

    render() {
        return (
            <View>
                <AppHeader title="confirmation"
                           parent={this}
                />
                <View style={CHSStyles.Global.mainSection}>
                    <DecisionSupportSessionComponent decisions={this.props.params.decisions}
                                                     questionAnswers={AppState.questionnaireAnswers.toArray()}/>
                </View>
                <View
                    style={{flexDirection: 'row', height: 100, justifyContent: 'space-between', marginTop: 30, paddingRight: 20}}>
                    <TouchableHighlight>
                        <Text onPress={this.onPrevious}
                              style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("previous")}</Text>
                    </TouchableHighlight>
                    <TouchableHighlight>
                        <Text onPress={this.onSaveAndRestart}
                              style={[CHSStyles.Global.navButton, CHSStyles.Global.navButtonVisible]}>{I18n.t("saveAndRestart")}</Text>
                    </TouchableHighlight>
                </View>
            </View>
        );
    }
}

export default ConfirmationView;