import  {StyleSheet, View, ListView, DrawerLayoutAndroid, Text} from 'react-native';
import React, {Component} from 'react';
import Path, {PathRoot} from '../../framework/routing/Path';
import QuestionnaireButton from './QuestionnaireButton';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';

@Path('/diseaseList')
class DiseaseListView extends Component {

    constructor(props, context) {
        super(props, context);
        const questionnaireNames = context.getService("questionnaireService").getQuestionnaireNames();
        this.state = {dataSource: DiseaseListView.initialDataSource().cloneWithRows(questionnaireNames)};
    }

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap'
        }
    });

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (row_1, row_2) => row_1 !== row_2});

    render() {
        return (
            //TODO: Separate this out in another component
            <DrawerLayoutAndroid
                drawerWidth={300}
                drawerPosition={DrawerLayoutAndroid.positions.Left}
                renderNavigationView={() => <SettingsView/>}>
                <View>
                    <AppHeader title="questionnaireList" parent={this}/>
                    <ListView
                        contentContainerStyle={DiseaseListView.styles.list}
                        dataSource={this.state.dataSource}
                        renderRow={(rowItem) => <QuestionnaireButton diseaseName={rowItem}/>}
                    />
                </View>
            </DrawerLayoutAndroid>
        );
    }
}

export default DiseaseListView;
