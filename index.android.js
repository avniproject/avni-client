import React, {
    AppRegistry,
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import App from './src/components/app.js'

class OpenCHSClient extends Component {
    render() {
        return (
            <View style={styles.container}>
                <App />
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
