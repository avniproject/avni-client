import {View, ListView, StyleSheet} from 'react-native';
import AbstractComponent from '../../framework/view/AbstractComponent';
import React from 'react';
import QuestionnaireButton from './QuestionnaireButton';
import Actions from '../../action'

class QuestionnaireList extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.handleChange = this.handleChange.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.state = {questionnaires: [], loading: false};
        context.getStore().subscribe(this.handleChange);
    }

    handleChange() {
        this.setState({
            questionnaires: this.context.getStore().getState().questionnaires,
            loading: false
        });
    }

    componentDidMount() {
        this.setState({loading: true});
        setTimeout(()=>this.dispatchAction(Actions.GET_QUESTIONNAIRES), 500);
    }

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (row_1, row_2) => row_1 !== row_2});

    render() {
        const dataSource = QuestionnaireList.initialDataSource().cloneWithRows(this.state.questionnaires);
        return (
            <View>
                {this.renderComponent(this.state.loading, (<ListView
                    enableEmptySections={true}
                    contentContainerStyle={this.props.listStyle}
                    dataSource={dataSource}
                    renderRow={(questionnaire) => <QuestionnaireButton questionnaire={questionnaire}/>}
                />), "black", "large")}
            </View>);
    }
}

export default QuestionnaireList;