import {View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import * as CHSStyles from '../primitives/GlobalStyles';
import MessageService from '../../service/MessageService';

class DecisionSupportSessionComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

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
        getService: React.PropTypes.func.isRequired
    };

    static propTypes = {
        decisions: React.PropTypes.array.isRequired,
        questionAnswers: React.PropTypes.array.isRequired
    };

    renderRow(key, value) {
        return (
            <View style={CHSStyles.Global.listRow}>
                <View style={CHSStyles.Global.listCellContainer}>
                    <Text
                        style={CHSStyles.Global.listCell}>{this.I18n.t(key)}</Text>
                </View>
                <View style={CHSStyles.Global.listCellContainer}>
                    <Text
                        style={CHSStyles.Global.listCell}>{General.formatValue(value)}</Text>
                </View>
            </View>);
    }

    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(this.props.questionAnswers);

        const dsDecisions = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsDecisionsClone = ds.cloneWithRows(this.props.decisions);

        return (
            <View>
                <View style={CHSStyles.Global.listViewContainer}>
                    <ListView
                        dataSource={dsClone}
                        renderRow={(rowData) => this.renderRow(rowData.question, rowData.answerAsString())}
                        renderHeader={() => <Text
                            style={CHSStyles.Global.listViewHeader}>{this.I18n.t("answersConfirmationTitle")}</Text>}
                        renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text
                            key={rowID}
                            style={{height: adjacentRowHighlighted ? 1 : 2,
                                backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
                    />
                </View>

                <View style={CHSStyles.Global.listViewContainer}>
                    <ListView
                        dataSource={dsDecisionsClone}
                        renderRow={(decision) => this.renderRow(decision.name, decision.value)}
                        renderHeader={() => <Text
                            style={CHSStyles.Global.listViewHeader}>{this.I18n.t('decisionsMadeBySystem')}</Text>}
                        renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text
                            key={rowID}
                            style={{
                            height: adjacentRowHighlighted ? 1 : 2,
                            backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'
                        }}></Text>}
                    />
                </View>
            </View>);
    }
}

export default DecisionSupportSessionComponent;