import React, {
    AppRegistry,
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import DiseaseList from './src/components/diseaseView.js'

class OpenCHSClient extends Component {
    render() {
        return (
            <View style={styles.container}>
                <DiseaseList />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#FFFFFF'
    }
});

AppRegistry.registerComponent('OpenCHSClient', () => OpenCHSClient);
