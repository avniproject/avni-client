import React, {
    Component,
    StyleSheet,
    Text,
    View
} from 'react-native';

import ViewWrapper from './viewWrapper.js';

class QuestionAnswer extends Component {

    render() {
        return (
            <View>
                <Text style={styles.header}>{"HELLO WORLD"}</Text>
            </View>
        );
    }
}


const styles = StyleSheet.create({
    header: {
        height: 100,
        width: 100,
        alignSelf: 'center',
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    }
});

export default new ViewWrapper("questionAnswer", QuestionAnswer);