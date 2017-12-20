import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import AddressHeader from './AddressHeader';
import VisitBlock from './VisitBlock';
import DGS from "../primitives/DynamicGlobalStyles";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualList from "../individuallist/IndividualList";

class AddressVisitRow extends AbstractComponent {
    static propTypes = {
        address: React.PropTypes.object,
        visits: React.PropTypes.object,
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
        }).to(IndividualList);
    }

    render() {
        const visitBlocks = _.toPairs(this.props.visits).map(([title, numberObj], idx) =>
            (<VisitBlock key={idx}
                         highlight={numberObj.abnormal}
                         onPress={this.onPressHandler.bind(this)(this.props.address, title, numberObj.count)}
                         title={title}
                         number={numberObj.count}/>));
        return (
            <View style={AddressVisitRow.styles.container}>
                <AddressHeader address={this.props.address}/>
                <View style={AddressVisitRow.styles.visitBlockContainer}>
                    {visitBlocks}
                </View>
            </View>
        );
    }
}

export default AddressVisitRow;