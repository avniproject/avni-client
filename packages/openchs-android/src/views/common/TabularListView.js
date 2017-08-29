import {View, Text, StyleSheet, TouchableNativeFeedback} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import DGS from "../primitives/DynamicGlobalStyles";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Separator from "../primitives/Separator";
import {List, ListItem} from "native-base";

class TabularListView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        data: React.PropTypes.object.isRequired,
        tableTitle: React.PropTypes.string.isRequired,
        handleClick: React.PropTypes.func,
        getRow: React.PropTypes.func.isRequired,
        headerTitleKeys: React.PropTypes.array.isRequired,
        emptyTableMessage: React.PropTypes.string.isRequired
    };

    renderRow(rowEntity, tableTitle) {
        const rowData = this.props.getRow(rowEntity);
        return (<ListItem style={{flexDirection: 'row'}} key={`${tableTitle}`}>
            {rowData.map((cell, index) => <Text key={`${tableTitle}${index}`} style={{flex: 1}} onPress={() => this.props.handleClick(rowEntity)}>{cell}</Text>)}
        </ListItem>);
    }

    render() {
        if (_.isEmpty(this.props.data))
            return (<View style={{flexDirection: 'row', justifyContent: 'center', marginTop: DGS.resizeHeight(10)}}>
                <Text>{this.props.emptyTableMessage}</Text>
            </View>
        );

        return (
            <View>
                {_.isEmpty(this.props.tableTitle) ? <View/> : <Text style={DGS.card.table.title}>{this.props.tableTitle}</Text>}
                <View style={{flexDirection: 'row', marginTop: DGS.resizeHeight(26)}}>
                    {this.props.headerTitleKeys.map((titleKey, index) => this.getTableHeaderCell(titleKey, `${this.props.tableTitle}Header${index}`))}
                </View>
                <View style={{marginTop: DGS.resizeHeight(17.8)}}>
                    <Separator/>
                </View>
                <List primaryText={''} dataArray={this.props.data} renderRow={(rowEntity) => this.renderRow(rowEntity, this.props.tableTitle)}/>
            </View>
        );
    }

    getTableHeaderCell(messageKey, rowKey) {
        return <Text key={rowKey} style={{flex: 0.25, color: Colors.InputNormal, fontSize: Fonts.Normal}}>{this.I18n.t(messageKey)}</Text>;
    }
}

export default TabularListView;