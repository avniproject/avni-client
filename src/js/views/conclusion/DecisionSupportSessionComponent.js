import React, {Component, View, ListView, Text, StyleSheet, TouchableOpacity} from 'react-native';
import General from '../../utility/General';
import I18n from '../../utility/Messages';

class DecisionSupportSessionComponent extends Component {
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
        decision: React.PropTypes.object.isRequired,
        questionAnswers: React.PropTypes.array.isRequired
    };

    renderRow(key, value) {
        return (
            <View style={{flex: 1, flexDirection: 'row'}}>
                <View style={{flex: 0.5}}>
                    <Text
                        style={[DecisionSupportSessionComponent.styles.question, DecisionSupportSessionComponent.styles.question]}>{I18n.t(key)}</Text>
                </View>
                <View style={{flex: 0.5}}>
                    <Text style={[DecisionSupportSessionComponent.styles.question, DecisionSupportSessionComponent.styles.answer]}>{General.formatValue(value)}</Text>
                </View>
            </View>);
    }

    render() {
        const decision = this.props.decision;
        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        var dsClone = ds.cloneWithRows(this.props.questionAnswers);

        return (<View>
            <ListView
                dataSource={dsClone}
                renderRow={(rowData) => this.renderRow(rowData.question, rowData.answer)}
                renderHeader={() => <Text style={{fontSize: 24, color: '#000000'}}>{I18n.t("answersConfirmationTitle")}</Text>}
                renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text style={{height: adjacentRowHighlighted ? 1 : 2,
                                                                                                     backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
            />
            <Text style={{fontSize: 24, marginTop: 10, color: '#000000'}}>{I18n.t('decisionsMadeBySystem')}</Text>
            {this.renderRow(decision.name, decision.value)}
        </View>);
    }
}

export default DecisionSupportSessionComponent;