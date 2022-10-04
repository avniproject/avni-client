import {StyleSheet, Text, View} from "react-native";
import ListView from "deprecated-react-native-listview";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import _ from 'lodash';
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";

class EntitySyncStatusTable extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        const groups = _.groupBy(this.props.data, 'type');
        const sortedRows = _.concat(_.sortBy(groups.tx, ['entityName']), _.sortBy(groups.reference, ['entityName']));
        return <View>
            <View>
                <View style={[defaultStyles.tableHeaderRow]}>
                    <Text style={[defaultStyles.tableColHeader, {flex: 5, paddingLeft: 8,}]}>{this.I18n.t('entityName')}</Text>
                    <Text style={[defaultStyles.tableColHeader, {flex: 2.2,}]}>{this.I18n.t('loadedSince')}</Text>
                    <Text style={[defaultStyles.tableColHeader, {flex: 1,}]}>{this.I18n.t('queuedCount')}</Text>
                </View>
                <ListView
                    enableEmptySections={true}
                    dataSource={new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(sortedRows)}
                    removeClippedSubviews={true}
                    renderRow={(rowData) =>
                        <View style={[defaultStyles.tableRow]}>
                            <Text style={[defaultStyles.tableCell, {
                                flex: 5,
                                marginLeft: 8
                            }, rowData.queuedCount ? {color: Styles.redColor} : {}]
                            }>
                                {rowData.entityName}
                            </Text>
                            <Text style={[defaultStyles.tableCell, {
                                flex: 2.2,
                                borderLeftColor: Colors.InputBorderNormal,
                                borderLeftWidth: StyleSheet.hairlineWidth,
                                borderRightColor: Colors.InputBorderNormal,
                                borderRightWidth: StyleSheet.hairlineWidth,
                                paddingLeft: 8
                            }, rowData.queuedCount ? {color: Styles.redColor} : {}]
                            }>
                                {rowData.loadedSince}
                            </Text>
                            <Text style={[defaultStyles.tableCell, {
                                flex: 1,
                                textAlign: 'center',
                            }, rowData.queuedCount ? {color: Styles.redColor} : {}]
                            }>
                                {rowData.queuedCount}
                            </Text>
                        </View>
                    }
                />
            </View>
        </View>;
    }
}

const defaultStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 30
    },
    tableRow: {
        flexDirection: "row",
        paddingTop: 4,
        borderBottomColor: Colors.InputBorderNormal,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderLeftColor: Colors.InputBorderNormal,
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderRightColor: Colors.InputBorderNormal,
        borderRightWidth: StyleSheet.hairlineWidth,
        height: 56,
        backgroundColor: Colors.GreyContentBackground
    },
    tableHeaderRow: {
        marginTop: 4,
        flexDirection: "row",
        borderBottomColor: Colors.InputBorderNormal,
        borderBottomWidth: StyleSheet.hairlineWidth,
        height: 56,
        backgroundColor: Colors.HighlightBackgroundColor
    },
    tableCell: {
        textAlign: 'left',
        fontSize: Fonts.Normal,
        color: Styles.greyText,
        paddingTop:16
    },
    tableColHeader: {
        borderLeftWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.12)',
        paddingLeft: 3,
        paddingBottom: 2,
        textAlign: 'left',
        fontSize: Fonts.Normal,
        color: Styles.greyText,
        fontWeight: 'bold',
        paddingTop:16
    }
});
export default EntitySyncStatusTable;
