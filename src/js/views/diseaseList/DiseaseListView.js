import React, { Component, StyleSheet, View, ListView, DrawerLayoutAndroid } from 'react-native';
import Path, { PathRoot } from '../../routing/Path';
import Diseases from '../../../config/diseases.json';
import DiseaseButton from './DiseaseButton';
import DiseaseHeader from './DiseaseHeader';
import DiseaseNavigationMenu from './DiseaseNavigationMenu';

@PathRoot
@Path('/diseaseList') class DiseaseListView extends Component {

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    });

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    state = {
        dataSource: DiseaseListView.initialDataSource().cloneWithRows(Diseases),
    };

    render() {
        return (
            <DrawerLayoutAndroid
                drawerWidth={300}
                drawerPosition={DrawerLayoutAndroid.positions.Left}
                renderNavigationView={() => <DiseaseNavigationMenu/>}
                >
                <View>
                    <DiseaseHeader/>
                    <ListView
                        contentContainerStyle={DiseaseListView.styles.list}
                        dataSource={this.state.dataSource}
                        renderRow={(rowItem) => <DiseaseButton diseaseName={rowItem}/>}
                        />
                </View>
            </DrawerLayoutAndroid>
        );
    }
}

export default DiseaseListView;
