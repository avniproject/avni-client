import {View, ListView, Text, StyleSheet, TouchableNativeFeedback} from 'react-native';
import React, {Component} from 'react';
import General from '../../utility/General';
import AbstractComponent from '../../framework/view/AbstractComponent';
import * as CHSStyles from '../primitives/GlobalStyles';
import MessageService from '../../service/MessageService';
import _ from 'lodash';

class TabularListView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.clickable = this.clickable.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    static propTypes = {
        data: React.PropTypes.array.isRequired,
        message: React.PropTypes.string.isRequired,
        handleClick: React.PropTypes.func,
    };

    clickable() {
        return !_.isNil(this.props.handleClick);
    }

    handleClick(index) {
        return this.clickable() ? ()=> this.props.handleClick(index) : General.emptyFunction;
    }

    renderRow(rowData) {
        const WrappingComponent = this.clickable() ? TouchableNativeFeedback : View;

        return (
            <WrappingComponent onPress={this.handleClick(rowData.index)}>
                <View style={CHSStyles.Global.listRow}>

                    <View style={CHSStyles.Global.listCellContainer}>
                        <Text
                            style={CHSStyles.Global.listCell}>{this.I18n.t(rowData.key)}</Text>
                    </View>
                    <View style={CHSStyles.Global.listCellContainer}>
                        <Text
                            style={CHSStyles.Global.listCell}>{rowData.value}</Text>
                    </View>

                </View>
            </WrappingComponent>);
    }

    render() {
        if (_.isEmpty(this.props.data)) return (<View/>);
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(this.props.data);

        return (
            <View style={CHSStyles.Global.listViewContainer} keyboardShouldPersistTaps={true}>
                <ListView
                    keyboardShouldPersistTaps={true}
                    dataSource={dsClone}
                    renderRow={(rowData) => this.renderRow(rowData)}
                    enableEmptySections={true}
                    renderHeader={() => <Text
                        style={CHSStyles.Global.listViewHeader}>{this.I18n.t(this.props.message)}</Text>}
                    renderSeparator={(sectionID, rowID, adjacentRowHighlighted) => <Text
                        key={rowID}
                        style={{
                            height: adjacentRowHighlighted ? 1 : 2,
                            backgroundColor: adjacentRowHighlighted ? '#3B5998' : '#CCCCCC'
                        }}/>}
                />
            </View>
        );
    }
}

export default TabularListView;