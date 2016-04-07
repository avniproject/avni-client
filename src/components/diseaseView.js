import React, {
    Component,
    StyleSheet,
    Text,
    View,
    ListView
} from 'react-native';

import diseases from '../config/diseases.json'
import ViewWrapper from './viewWrapper.js';

class DiseaseButton extends Component {
    render() {
        return (
            <Text style={styles.item}>{this.props.diseaseName}</Text>
        );
    }
}

class DiseaseViewHeader extends Component {
    render() {
        return (
            <Text style={styles.header}>{"Pick a Disease"}</Text>
        );
    }
}

class DiseaseList extends Component {
    constructor(props) {
        super(props);
        var dataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        this.state = {
            "dataSource": dataSource.cloneWithRows(Object.keys(diseases)),
            "diseases": diseases
        };
    }

    render() {
        return (
            <View>
                <DiseaseViewHeader/>
                <ListView contentContainerStyle={styles.list}
                          dataSource={this.state.dataSource}
                          renderRow={(rowItem) => <DiseaseButton diseaseName={rowItem}></DiseaseButton>}>
                </ListView>
            </View>
        );
    }
}


const styles = StyleSheet.create({
    list: {
        justifyContent: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    item: {
        backgroundColor: '#CCC',
        margin: 10,
        width: 100,
        height: 100,
        textAlign: 'center',
        justifyContent: 'center'
    },
    header: {
        height: 100,
        width: 100,
        alignSelf: 'center',
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    }
});

export default new ViewWrapper("/diseaseList", DiseaseList);