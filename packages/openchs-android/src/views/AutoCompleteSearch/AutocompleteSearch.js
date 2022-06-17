import React from 'react';
import {FlatList, Text, TextInput, TouchableOpacity, UIManager, View} from 'react-native';
import PropTypes from 'prop-types';
import find from 'lodash/find';
import get from 'lodash/get';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";

if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

/*
* Heavily inspired from https://github.com/toystars/react-native-multiple-select
*
* items: Items should be an array of objects having unique key and display value.
*        By default displayKey is name and uniqueKey is uuid and this can be overridden by the respective props.
* onSelectedItemsChange: Function to be invoked when any item is pressed.
*                        uniqueKey value of that item is passed to this function.
* selectedItems: uniqueKey values of the already selected items. This is used to display the selected items at the bottom.
* uniqueKey: Unique key in the item object default to uuid.
* displayKey: display key in the item object default to name.
* isMulti: boolean to represent if multiple values can be selected.
*
* */

export default class AutocompleteSearch extends AbstractComponent {
    static propTypes = {
        items: PropTypes.array.isRequired,
        onSelectedItemsChange: PropTypes.func.isRequired,
        selectedItems: PropTypes.array,
        uniqueKey: PropTypes.string,
        displayKey: PropTypes.string,
        isMulti: PropTypes.bool,
    };

    static defaultProps = {
        isMulti: false,
        selectedItems: [],
        displayKey: 'name',
        uniqueKey: 'uuid'
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            selector: true,
            searchTerm: ''
        };
    }

    viewName() {
        return 'AutocompleteSearch';
    }

    shouldComponentUpdate() {
        return true;
    }

    _onChangeInput = value => this.setState({searchTerm: value});

    _findItem = itemKey => {
        const {items, uniqueKey} = this.props;
        return find(items, singleItem => singleItem[uniqueKey] === itemKey) || {};
    };

    _displaySelectedItems = () => {
        const {uniqueKey, selectedItems, displayKey} = this.props;
        return selectedItems.map(singleSelectedItem => {
            const item = this._findItem(singleSelectedItem);
            const itemDisplayValue = item[displayKey];
            if (!itemDisplayValue) return null;
            const i18nItemDisplayValue = this.I18n.t(itemDisplayValue);
            return (
                <View style={[styles.selectedItem, {width: i18nItemDisplayValue.length * 8 + 60}]} key={item[uniqueKey]}>
                    <Text style={styles.displayItemTextStyle} numberOfLines={1}>
                        {i18nItemDisplayValue}
                    </Text>
                    <TouchableOpacity onPress={() => this._removeItem(item)}>
                        <Icon name="close-circle" style={styles.cancelIconStyle}/>
                    </TouchableOpacity>
                </View>
            );
        });
    };

    _removeItem = item => {
        const {uniqueKey, onSelectedItemsChange} = this.props;
        onSelectedItemsChange(item[uniqueKey]);
    };

    _clearSearchTerm = () => this.setState({searchTerm: ''});

    _submitSelection = () => this._clearSearchTerm();

    _itemSelected = item => {
        const {uniqueKey, selectedItems} = this.props;
        return selectedItems.indexOf(item[uniqueKey]) !== -1;
    };

    _toggleItem = item => {
        const {
            isMulti,
            uniqueKey,
            onSelectedItemsChange
        } = this.props;
        if (isMulti) {
            onSelectedItemsChange(item[uniqueKey]);
        } else {
            this._submitSelection();
            onSelectedItemsChange(item[uniqueKey]);
        }
    };

    _itemStyle = item => {
        const isSelected = this._itemSelected(item);
        return isSelected ? {color: Colors.Complimentary} : {color: Colors.InputNormal};
    };

    _getRow = item => {
        const {displayKey, uniqueKey} = this.props;
        return (
            <TouchableOpacity key={item[uniqueKey]} onPress={() => this._toggleItem(item)} style={styles.styleRowList}>
                <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.itemTextStyle, this._itemStyle(item)]}>
                            {this.I18n.t(item[displayKey])}
                        </Text>
                        {this._itemSelected(item) ?
                            <Icon name="check" style={{fontSize: 20, color: Colors.ActionButtonColor}}/> :
                            null}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    _filterItems = searchTerm => {
        const {items, displayKey} = this.props;
        const filteredItems = [];
        items.forEach(item => {
            const tokens = searchTerm.trim().split(/[ \-:]+/);
            const regex = new RegExp(`(${tokens.join('.*')})`, 'ig');
            const displayValue = get(item, displayKey);
            const i18nDisplayValue = displayValue ? this.I18n.t(displayValue) : displayValue;
            if (regex.test(i18nDisplayValue)) {
                filteredItems.push(item);
            }
        });
        return filteredItems;
    };

    _renderItems = () => {
        const {items, uniqueKey, selectedItems} = this.props;
        const {searchTerm} = this.state;
        let itemList;
        const renderItems = searchTerm ? this._filterItems(searchTerm) : items;
        if (renderItems.length) {
            itemList = (
                <FlatList
                    data={renderItems}
                    extraData={selectedItems}
                    keyExtractor={(item, index) => index.toString()}
                    listKey={item => item[uniqueKey]}
                    renderItem={rowData => this._getRow(rowData.item)}
                    nestedScrollEnabled
                />
            );
        } else {
            itemList = (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.noItemsText}>
                        {this.I18n.t('noItemsToDisplay')}
                    </Text>
                </View>
            );
        }
        return (
            <View style={{maxHeight: 256}}>
                {itemList}
            </View>
        );
    };

    render() {
        const {selectedItems, isMulti} = this.props;
        const {searchTerm} = this.state;
        return (
            <View style={{flexDirection: 'column'}}>
                <View style={styles.selectorView}>
                    <View style={styles.inputGroup}>
                        <Icon
                            name="magnify"
                            size={20}
                            color={Colors.SecondaryText}
                            style={{marginRight: 10}}
                        />
                        <TextInput
                            onChangeText={this._onChangeInput}
                            placeholder={this.I18n.t('searchByTyping')}
                            placeholderTextColor={Colors.SecondaryText}
                            underlineColorAndroid="transparent"
                            style={{flex: 1}}
                            value={searchTerm}
                        />
                        {_.size(this.state.searchTerm) > 0 && isMulti &&
                        <TouchableOpacity onPress={this._submitSelection}>
                            <Icon
                                name='check-circle'
                                style={styles.indicator}
                            />
                        </TouchableOpacity>}
                    </View>
                    {this.state.searchTerm ?
                        <View style={{flexDirection: 'column', backgroundColor: '#fafafa'}}>
                            <View>
                                {this._renderItems()}
                            </View>
                        </View> : null}
                </View>
                {selectedItems.length ? (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                        {this._displaySelectedItems()}
                    </View>
                ) : null}
            </View>
        );
    }
}


const styles = {
    indicator: {
        fontSize: 30,
        color: Colors.ActionButtonColor,
        paddingLeft: 15,
        paddingRight: 15
    },
    selectedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 15,
        paddingTop: 3,
        paddingRight: 3,
        paddingBottom: 3,
        margin: 3,
        borderRadius: 20,
        borderWidth: 2,
        justifyContent: 'center',
        height: 30,
        borderColor: Colors.Complimentary
    },
    selectorView: {
        flexDirection: 'column',
        marginBottom: 10,
        elevation: 2,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        backgroundColor: Colors.cardBackgroundColor,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal
    },
    noItemsText: {
        flex: 1,
        marginTop: 20,
        textAlign: 'center',
        color: Colors.ValidationError
    },
    itemTextStyle: {
        flex: 1,
        fontSize: 16,
        paddingTop: 5,
        paddingBottom: 5
    },
    styleRowList: {
        paddingLeft: 20,
        paddingRight: 20
    },
    cancelIconStyle: {
        color: Colors.NegativeActionButtonColor,
        fontSize: 22,
        marginLeft: 10
    },
    displayItemTextStyle: {
        flex: 1,
        color: Colors.Complimentary,
        fontSize: 15
    }
};
