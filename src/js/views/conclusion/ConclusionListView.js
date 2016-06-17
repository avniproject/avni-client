import Path from '../../routing/Path';
import React, {Component, View, Text, StyleSheet, ListView} from 'react-native';

@Path('/ConclusionListView')
class ConclusionListView extends Component {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dssService = this.context.getService("decisionSupportSessionService");
        var sessions = dssService.getAll(this.props.questionnaireName);
        const dsClone = ds.cloneWithRows(sessions);

        return (
            <View>
                <AppHeader title={`All ${this.props.questionnaireName} Details`}/>
                <ListView
                    dataSource={dsClone}
                    renderRow={(rowData) => this.renderQuestionAnswer(rowData.answer, rowData.question, null)}
                    renderHeader={() => <Text style={{fontSize: 24}}>You answered as follows</Text>}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text style={{height: adjacentRowHighlighted ? 4 : 1,
                                                                                                     backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'}}></Text>}
                />
            </View>
        );
    }
}

export default ConclusionListView;