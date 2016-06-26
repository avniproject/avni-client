import React, {Component, StyleSheet, View, ListView, DrawerLayoutAndroid, Text} from 'react-native';
import Path, {PathRoot} from '../../routing/Path';
import QuestionnaireNames from '../../../config/questionnaires.json';
import QuestionnaireButton from './QuestionnaireButton';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';

@Path('/diseaseList')
class DiseaseListView extends Component {
    static contextTypes = {
        navigator: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap'
        }
    });

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    state = {
        dataSource: DiseaseListView.initialDataSource().cloneWithRows(QuestionnaireNames)
    };
    
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
