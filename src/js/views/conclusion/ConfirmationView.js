import React, {Component, View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import TypedTransition from "../../routing/TypedTransition";
import * as CHSStyles from "../primitives/GlobalStyles";
import AppHeader from '../primitives/AppHeader';
import Path from "../../routing/Path";
import AppState from '../../hack/AppState';
import I18n from '../../utility/Messages';
import General from '../../utility/General';

@Path('/ConfirmationView')
class ConfirmationView extends Component {
    static styles = StyleSheet.create({
        questionAnswer: {
            fontSize: 18,
            flexDirection: 'column'
        },
        question: {
            color: '#0C59CF'
        },
        answer: {}
    });

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

    renderRow(key, value) {
        var displayValue = value instanceof Date ? General.formatDate(value) : value;

        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <View style={{flex: 0.5}}>
                    <Text
                        style={[ConfirmationView.styles.questionAnswer, ConfirmationView.styles.question]}>{key}</Text>
                </View>
                <View style={{flex: 0.5}}>
                    <Text style={[ConfirmationView.styles.questionAnswer, ConfirmationView.styles.answer]}>{displayValue}</Text>
                </View>
            </View>);
    }

    render() {
        const decision = this.props.params.decisions[0];
        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        var dsClone = ds.cloneWithRows(AppState.questionnaireAnswers.toArray());

        return (
            <View>
                <AppHeader title="confirmation"
                           parent={this}
                />
                <ListView
                    dataSource={dsClone}
                    renderRow={(rowData) => this.renderRow(rowData.question, rowData.answer)}
                    renderHeader={() => <Text style={{fontSize: 24}}>{I18n.t("answersConfirmationTitle")}</Text>}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text style={{height: adjacentRowHighlighted ? 4 : 1,
                                                                                                     backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
                />
                <Text style={{fontSize: 24}}>Decisions made by system</Text>
                {this.renderRow(decision.name, decision.value)}
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