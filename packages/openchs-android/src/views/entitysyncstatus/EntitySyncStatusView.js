import {ListView, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Actions from "../../action/common/EntitySyncStatusActions";
import {ListItem} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";

@Path('/entitySyncStatusView')
class EntitySyncStatusView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.entitySyncStatusList);
        this.styles = {
            table: {
                marginHorizontal: 3,
                backgroundColor: Colors.GreyContentBackground
            },
            row: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
            column: {
                textAlign: 'left',
                fontSize: Fonts.Normal,
                color: Styles.greyText,
                borderLeftWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.12)',
                flex: 1
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

    renderItem(row) {
        const queuedStyle = row.queuedCount > 0 ? [this.styles.column, {color: Styles.redColor, textAlign: 'right'}] :
            [this.styles.column, {color: Styles.blackColor, textAlign: 'right'}];
        return (
            <ListItem style={this.styles.row}>
                <Text style={this.styles.column}>{row.entityName}</Text>
                <Text style={this.styles.column}>{row.loadedSince}</Text>
                <Text style={queuedStyle}>{row.queuedCount}</Text>
            </ListItem>);
    }

    renderTitle() {
        return (<View>
            <Text style={DGS.card.table.title}>{this.I18n.t('entitySyncStatus')}</Text>
            <Text style={[DGS.card.table.title, {textAlign: 'right'}]}>
                {this.I18n.t('totalQueuedCount')}: {this.state.totalQueueCount}</Text>
        </View>);
    }

    render() {
        const dataSource = new ListView.DataSource({rowHasChanged: () => false})
            .cloneWithRows(this.state.entitySyncStatusList);
        return (
            <View>
                {this.renderTitle()}
                <View style={{flexDirection: 'row', marginTop: DGS.resizeHeight(26)}}>
                    <Text style={{flex: 2, color: Colors.InputNormal, fontSize: Fonts.Normal}}>{this.I18n.t('entityName')}</Text>
                    <Text style={{flex: 2, color: Colors.InputNormal, fontSize: Fonts.Normal}}>{this.I18n.t('loadedSince')}</Text>
                    <Text style={{color: Colors.InputNormal, fontSize: Fonts.Normal}}>{this.I18n.t('queuedCount')}</Text>
                </View>
                <ListView
                    style={this.styles.table}
                    enableEmptySections={true}
                    dataSource={dataSource}
                    removeClippedSubviews={true}
                    renderRow={(rowData) => this.renderItem(rowData)}
                />
            </View>
        );
    }
}

export default EntitySyncStatusView;