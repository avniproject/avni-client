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
                <TabularListView data={this.props.questionAnswers} message={"answersConfirmationTitle"}/>
                <TabularListView data={decisions} message={"decisionsMadeBySystem"}/>
            </View>);
    }
}

export default DecisionSupportSessionComponent;