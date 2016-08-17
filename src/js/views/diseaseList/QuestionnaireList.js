import {View, ListView, StyleSheet} from 'react-native';
import AbstractComponent from '../../framework/view/AbstractComponent';
import React from 'react';
import QuestionnaireButton from './QuestionnaireButton';
import Actions from '../../action';

class QuestionnaireList extends AbstractComponent {
    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (row_1, row_2) => row_1 !== row_2});

    componentDidMount() {
        this.dispatchAction(Actions.GET_QUESTIONNAIRES);
    }

    render() {
        const dataSource = QuestionnaireList.initialDataSource().cloneWithRows(this.props.questionnaires);
        return (
            <View style={{flex: 0, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap'}}>
                <ListView
                    enableEmptySections={true}
                    contentContainerStyle={this.props.style}
                    dataSource={dataSource}
                    renderRow={(questionnaire) => <QuestionnaireButton questionnaire={questionnaire}/>}
                />
            </View>);
    }
}

export default QuestionnaireList;