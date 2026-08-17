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
        return <View style={defaultStyles.tableCard}>
            <View style={[defaultStyles.tableHeaderRow]}>
                <Text style={[defaultStyles.tableColHeader, {flex: 4.3, paddingLeft: 8,}]}>{this.I18n.t('entityName')}</Text>
                <Text style={[defaultStyles.tableColHeader, {flex: 2.2,}]}>{this.I18n.t('loadedSince')}</Text>
                <Text numberOfLines={1}
                      style={[defaultStyles.tableColHeader, {flex: 1.6, textAlign: 'center', paddingLeft: 0}]}>{this.I18n.t('queuedCount')}</Text>
            </View>
            <ListView
                enableEmptySections={true}
                dataSource={new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(sortedRows)}
                removeClippedSubviews={true}
                renderRow={(rowData, sectionId, rowId) =>
                    <View style={[defaultStyles.tableRow, Number(rowId) === sortedRows.length - 1 && {borderBottomWidth: 0}]}>
                        <Text style={[defaultStyles.tableCell, {
                            flex: 4.3,
                            marginLeft: 8
                        }, rowData.queuedCount ? {color: Colors.ValidationError} : {}]
                        }>
                            {rowData.entityName}
                        </Text>
                        <Text style={[defaultStyles.tableCell, {
                            flex: 2.2,
                            borderLeftColor: Colors.BorderDefault,
                            borderLeftWidth: StyleSheet.hairlineWidth,
                            borderRightColor: Colors.BorderDefault,
                            borderRightWidth: StyleSheet.hairlineWidth,
                            paddingLeft: 8
                        }, rowData.queuedCount ? {color: Colors.ValidationError} : {}]
                        }>
                            {rowData.loadedSince}
                        </Text>
                        <Text style={[defaultStyles.tableCell, {
                            flex: 1.6,
                            textAlign: 'center',
                        }, rowData.queuedCount ? {color: Colors.ValidationError} : {}]
                        }>
                            {rowData.queuedCount}
                        </Text>
                    </View>
                }
            />
        </View>;
    }
}

const defaultStyles = StyleSheet.create({
    tableCard: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: Colors.WhiteContentBackground
    },
    tableRow: {
        flexDirection: "row",
        alignItems: 'center',
        borderBottomColor: Colors.BorderDefault,
        borderBottomWidth: StyleSheet.hairlineWidth,
        height: 56,
        backgroundColor: Colors.WhiteContentBackground
    },
    tableHeaderRow: {
        flexDirection: "row",
        alignItems: 'center',
        borderBottomColor: Colors.BorderDefault,
        borderBottomWidth: 1,
        height: 48,
        backgroundColor: Colors.SectionHeaderBackground
    },
    tableCell: {
        textAlign: 'left',
        fontSize: Fonts.Normal,
        color: Colors.TextPrimaryDark
    },
    tableColHeader: {
        borderLeftWidth: 1,
        borderColor: Colors.BorderDefault,
        paddingLeft: 3,
        textAlign: 'left',
        fontSize: Fonts.Normal,
        color: Colors.TextSecondary,
        fontWeight: '600'
    }
});
export default EntitySyncStatusTable;
