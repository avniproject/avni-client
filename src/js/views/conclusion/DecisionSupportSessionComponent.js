import {View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import * as CHSStyles from '../primitives/GlobalStyles';
import TabularListView from './TabularListView';
import AbstractComponent from '../../framework/view/AbstractComponent';

class DecisionSupportSessionComponent extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
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
        const decisions = this.props.decisions.map(({name, value})=> {
            return {key: name, value: value};
        });
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
                {/*<TabularListView data={this.props.questionAnswers} message={"answersConfirmationTitle"}/>*/}
                {/*<TabularListView data={decisions} message={"decisionsMadeBySystem"}/>*/}
            </View>);
    }
}

export default DecisionSupportSessionComponent;