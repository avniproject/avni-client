import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import TitleNumberBlock from './TitleNumberBlock';
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualList from "../individuallist/IndividualList";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";

class StatusCountRow extends AbstractComponent {
    static propTypes = {
        address: PropTypes.object,
        visits: PropTypes.object,
        backFunction: PropTypes.func.isRequired,
    };

    static styles = StyleSheet.create({
        visitBlockContainer: {
            marginTop: 3,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 1,
        }
    });

    onPressHandler(title, count, backFunction, cardTitle) {
        this.dispatchAction(Actions.LOAD_INDICATOR, {status: true});
        setTimeout(() => TypedTransition.from(this).with({
            listType: title,
            total: count,
            backFunction: backFunction,
            cardTitle: cardTitle,
        }).to(IndividualList), 0);
    }

    render() {
        const visitBlocks = _.toPairs(this.props.visits).map(([title, numberObj], idx) => {
            const cardTitle = _.has(numberObj, "label") ? numberObj.label : title;
            return (<View style={{paddingLeft: 3}} key={idx}>
                <TitleNumberBlock
                    highlight={numberObj.abnormal}
                    onPress={() => this.onPressHandler(title, numberObj.count, this.props.backFunction, cardTitle)}
                    title={cardTitle}
                    number={numberObj.count}/>
            </View>)
        });
        return (
            <View style={StatusCountRow.styles.visitBlockContainer}>
                {visitBlocks}
            </View>
        );
    }
}

export default StatusCountRow;
