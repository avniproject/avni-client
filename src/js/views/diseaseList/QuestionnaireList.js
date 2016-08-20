import {View, ListView, StyleSheet} from 'react-native';
import AbstractComponent from '../../framework/view/AbstractComponent';
import React from 'react';
import QuestionnaireButton from './QuestionnaireButton';

class QuestionnaireList extends AbstractComponent {
    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (row_1, row_2) => row_1 !== row_2});

    render() {
        const dataSource = QuestionnaireList.initialDataSource().cloneWithRows(this.props.questionnaires);
        return (
            <View>
                {this.renderSpinner((<ListView
                    enableEmptySections={true}
                    contentContainerStyle={this.props.listStyle}
                    dataSource={dataSource}
                    renderRow={(questionnaire) => <QuestionnaireButton questionnaire={questionnaire}/>}
                />), "black", "large")}
            </View>);
    }
}

export default QuestionnaireList;