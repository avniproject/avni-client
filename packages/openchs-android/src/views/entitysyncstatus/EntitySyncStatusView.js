import {Alert, ListView, Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Actions from "../../action/common/EntitySyncStatusActions";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import EntityQueueService from "../../service/EntityQueueService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import moment from "moment";
import Distances from "../primitives/Distances";

@Path('/entitySyncStatusView')
class EntitySyncStatusView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.entitySyncStatusList);
        this.styles = {
            header: {
                flexDirection: 'row',
                overflow: 'hidden',
                height: 40,
                backgroundColor: '#f1f8ff',
                color: Colors.InputNormal,
                fontSize: Fonts.Normal
            },
            headerCell: {
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderColor: '#000',
                justifyContent: 'center',
                height: 40
            },
            table: {
                backgroundColor: Colors.GreyContentBackground,
            },
            row: {
                flexDirection: 'row',
                overflow: 'hidden',
                height: 28
            },
            cell: {
                flex: 1,
                justifyContent: 'center',
                fontSize: Fonts.Normal,
                textAlign: 'center',
                color: Styles.greyText,
                borderLeftWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.12)'
            }
        };
    }

    viewName() {
        return 'EntitySyncStatusView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.Names.ON_LOAD);
        super.componentWillMount();
    }

    renderRow(row) {
        const queuedStyle = row.queuedCount > 0 ? [this.styles.cell, {color: Styles.redColor}] :
            [this.styles.cell, {color: Styles.blackColor}];
        return (
            <View style={{
                height: 28,
                flexDirection: 'row',
                overflow: 'hidden'
            }}>
                {this.renderCell(1, row.entityName, 1)}
                {this.renderCell(2, moment(row.loadedSince).format("DD-MM-YYYY HH:MM:SS"), 1)}
                {this.renderCell(3, row.queuedCount, 0.25, queuedStyle)}
            </View>);
    }

    renderCell(key, item, flexValue, style) {
        return (<View style={
            {
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderColor: '#000',
                justifyContent: 'center',
                height: 40,
                flex: flexValue
            }}>
            <Text key={key} style={[
                {
                    color: Colors.InputNormal,
                    fontSize: Fonts.Normal,
                    textAlign: 'center'
                }, style]}>{item}</Text>
        </View>);
    }

    renderSummary() {
        const queuedStyle = this.state.totalQueueCount > 0 ? {color: Styles.redColor} : {color: Styles.blackColor};

        return (<View style={Styles.listContainer}>
            <Text style={Styles.textList}>
                {this.I18n.t('totalQueuedCount')}:
                 <Text style={[{fontSize: Styles.normalTextSize},queuedStyle]}>{this.state.totalQueueCount}</Text>
            </Text>
            <Text style={Styles.textList}>
                {this.I18n.t('lastLoaded')}:
                 <Text style={{fontSize: Styles.normalTextSize}}>{moment(this.state.lastLoaded).format("DD-MM-YYYY HH:MM:SS")}</Text>
            </Text>
        </View>);
    }

    forceSync() {
        const entityQueueService = this.context.getService(EntityQueueService);
        entityQueueService.requeueAll();
    }

    onForceSync() {
        Alert.alert(
            this.I18n.t('forceSyncWarning'),
            this.I18n.t('forceSyncWarningMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => this.forceSync()
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                },
                    style: 'cancel'
                }
            ]
        )
    }

    render() {
        const dataSource = new ListView.DataSource({rowHasChanged: () => false})
            .cloneWithRows(this.state.entitySyncStatusList);
        const headers = ['entityName', 'loadedSince', 'queuedCount'];
        const flexArr = [1, 1, 0.25];
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('entitySyncStatus')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        {this.renderSummary()}
                        <View style={
                            {
                                flex: 1,
                                padding: 16,
                                paddingTop: 30,
                                backgroundColor: '#fff'
                            }}>
                        <View style={
                            {
                                borderLeftWidth: 1,
                                borderBottomWidth: 1,
                                borderColor:  '#000'
                            }}>
                            <View style={this.styles.header}>
                                {headers.map((titleKey, index) => {
                                    return this.getTableHeaderCell(titleKey, `header${index}`, flexArr[index]);
                                })}
                            </View>
                            <ListView
                                style={this.styles.table}
                                enableEmptySections={true}
                                dataSource={dataSource}
                                removeClippedSubviews={true}
                                renderRow={(rowData) => this.renderRow(rowData)}
                            />
                        </View>
                        </View>
                        <TouchableNativeFeedback onPress={() => this.onForceSync()}>
                            <View style={[Styles.basicPrimaryButtonView, {paddingLeft: 8, paddingRight: 8, marginTop: Distances.VerticalSpacingBetweenFormElements}]}>
                                <Text style={{
                                    fontSize: Fonts.Medium,
                                    color: Colors.TextOnPrimaryColor
                                }}>Reset Sync</Text>
                            </View>
                        </TouchableNativeFeedback>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }

    getTableHeaderCell(messageKey, rowKey, flex) {
        return (<View style={[this.styles.headerCell, {flex}]}>
            <Text key={rowKey} style={
                {
                    color: Colors.InputNormal,
                    fontSize: Fonts.Normal,
                    textAlign: 'center'
                }}>{this.I18n.t(messageKey)}</Text>
        </View>);
    }
}

export default EntitySyncStatusView;