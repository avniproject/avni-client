import React, {
    Component,
    StyleSheet,
    Text,
    ListView
} from 'react-native';

import diseases from '../config/diseases.json'

class DiseaseButton extends Component {
    render() {
        return (
            <Text style={styles.item}>{this.props.diseaseName}</Text>
        );
    }
}

class DiseaseViewHeader extends Component {
    render() {
        console.log(this.props.stuff1);
        console.log(this.props.stuff2);
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
            <ListView style={styles.welcome}
                      dataSource={this.state.dataSource}
                      renderSectionHeader={_ => <DiseaseViewHeader/>}
                      renderRow={(rowItem) => <DiseaseButton diseaseName={rowItem}></DiseaseButton>}>
            </ListView>
        );
    }
}


const styles = StyleSheet.create({
    welcome: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10
    },
    header: {
        height: 100,
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    },
    item: {
        height: 80,
        width: 70,
        textAlign: 'center',
        color: '#333333',
        marginBottom: 5
    }
});


export default DiseaseList;