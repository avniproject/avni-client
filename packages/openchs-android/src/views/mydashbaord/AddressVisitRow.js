import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import TitleNumberBlock from './TitleNumberBlock';
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualList from "../individuallist/IndividualList";
import Distances from "../primitives/Distances";

class AddressVisitRow extends AbstractComponent {
    static propTypes = {
        address: PropTypes.object,
        visits: PropTypes.object,
        backFunction: PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        visitBlockContainer: {
            marginTop: 20,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
        }
    });

    onPressHandler(address, title, count, backFunction, cardTitle, visitInfo) {
        return () => TypedTransition.from(this).with({
            address: address,
            listType: title,
            total: count,
            backFunction: backFunction,
            cardTitle: cardTitle,
            visitInfo: visitInfo,
        }).to(IndividualList);
    }

    render() {
        const visitBlocks = _.toPairs(this.props.visits).map(([title, numberObj], idx) => {
            const cardTitle = _.has(numberObj, "label") ? numberObj.label : title;
            const visitInfo = _.has(numberObj, 'visitInfo') ? numberObj.visitInfo : [];
            return (<View style={{paddingLeft: 4}} key={idx}>
                <TitleNumberBlock
                                  highlight={numberObj.abnormal}
                                  onPress={this.onPressHandler.bind(this)(this.props.address, title, numberObj.count, this.props.backFunction, cardTitle, visitInfo)}
                                  title={cardTitle}
                                  number={numberObj.count}/>
            </View>)
        });
        return (
            <View style={AddressVisitRow.styles.visitBlockContainer}>
                {visitBlocks}
            </View>
        );
    }
}

export default AddressVisitRow;
