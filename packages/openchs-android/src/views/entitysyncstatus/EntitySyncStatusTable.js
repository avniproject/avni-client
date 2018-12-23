import {ListView, StyleSheet, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Row from "./EntitySyncStatusRow";
import Header from "./EntitySyncStatusHeader";
import Colors from "../primitives/Colors";

class EntitySyncStatusTable extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {data, headers, flexArr} = this.props;
        const dataSource = new ListView.DataSource({rowHasChanged: () => false})
            .cloneWithRows(data);
        return <View style={defaultStyles.container}>
            <View style={defaultStyles.table}>
                <Header titles={headers} flexArr={flexArr}/>
                <ListView
                    style={defaultStyles.tableContent}
                    enableEmptySections={true}
                    dataSource={dataSource}
                    removeClippedSubviews={true}
                    renderRow={(rowData) => <Row rowData={rowData} flexArr={flexArr}/>}
                />
            </View>
        </View>;
    }
}
const defaultStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 30,
        backgroundColor: '#fff'
    },
    table: {
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#000'
    },
    tableContent: {
        backgroundColor: Colors.GreyContentBackground,
    }
});
export default EntitySyncStatusTable;