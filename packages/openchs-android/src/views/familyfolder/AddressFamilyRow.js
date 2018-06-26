import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import AddressHeader from '../mydashbaord/AddressHeader';
import TitleNumberBlock from '../mydashbaord/TitleNumberBlock';
import DGS from "../primitives/DynamicGlobalStyles";
import TypedTransition from "../../framework/routing/TypedTransition";
import FamilyList from "./FamilyList";

class AddressFamilyRow extends AbstractComponent {
    static propTypes = {
        address: React.PropTypes.object.isRequired,
        familiesSummary: React.PropTypes.object.isRequired,
    };

    static styles = StyleSheet.create({
        container: {marginBottom: DGS.resizeHeight(25), marginTop: DGS.resizeHeight(16)},
        visitBlockContainer: {
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'space-between',
            alignItems: 'center',
        }
    });

    onPressHandler(address, title, count) {
        return () => TypedTransition.from(this).with({
            address: address,
            listType: title,
            total: count
        }).to(FamilyList);
    }

    render() {
        const familyBlocks = _.toPairs(this.props.familiesSummary).map(([title, numberObj], idx) =>
            (<TitleNumberBlock key={idx}
                         highlight={numberObj.abnormal}
                         onPress={this.onPressHandler.bind(this)(this.props.address, title, numberObj.count)}
                         title={_.has(numberObj, "label") ? numberObj.label : title}
                         number={numberObj.count}/>));
        return (
            <View style={AddressFamilyRow.styles.container}>
                <AddressHeader address={this.props.address}/>
                <View style={AddressFamilyRow.styles.visitBlockContainer}>
                    {familyBlocks}
                </View>
            </View>
        );
    }
}

export default AddressFamilyRow;