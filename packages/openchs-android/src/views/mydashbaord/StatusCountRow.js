import PropTypes from 'prop-types';
import React, {Fragment} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import _ from 'lodash';
import AbstractComponent from "../../framework/view/AbstractComponent";
import TitleNumberBlock from './TitleNumberBlock';
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualList from "../individuallist/IndividualList";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import ChecklistListingView from "../checklist/ChecklistListingView";

class StatusCountRow extends AbstractComponent {
    static propTypes = {
        address: PropTypes.object,
        visits: PropTypes.object,
        backFunction: PropTypes.func.isRequired,
    };

    static styles = StyleSheet.create({
        visitBlockContainer: {
            marginTop: 2,
            flexDirection: 'row',
            marginHorizontal: 10,
            flex: 1,
            flexWrap: 'wrap',
            marginBottom: 15,
        }
    });

    onPressHandler(title, count, backFunction, cardTitle) {
        this.dispatchAction(Actions.LOAD_INDICATOR, {status: true});
        if (title === "dueChecklist") {
            setTimeout(() => TypedTransition.from(this).with({
                total: count,
                backFunction: backFunction,
                cardTitle: cardTitle,
                results: this.props.dueChecklist,
                indicatorActionName: Actions.LOAD_INDICATOR,
                headerTitle: title,
                totalSearchResultsCount: count,
                listType: _.lowerCase("Due checklist"),
            }).to(ChecklistListingView, true), 0);
        } else {
            setTimeout(() => TypedTransition.from(this).with({
                total: count,
                backFunction: backFunction,
                cardTitle: cardTitle,
                listType: title,
            }).to(IndividualList), 0);
        }
    }

    render() {
        const {visits, backFunction, sectionName} = this.props;

        const visitBlocks = _.toPairs(visits).map(([title, numberObj], idx) => {
            const cardTitle = _.has(numberObj, "label") ? numberObj.label : title;
            return (<View key={idx}>
                <TitleNumberBlock
                    highlight={numberObj.abnormal}
                    onPress={() => this.onPressHandler(title, numberObj.count, backFunction, cardTitle)}
                    title={cardTitle}
                    number={numberObj.count}
                    index={idx}
                    {...numberObj}
                />
            </View>)
        });
        return (
            <Fragment>
                <Text style={[{
                    paddingHorizontal: 10,
                    fontSize: 17,
                }]}>
                    {this.I18n.t(sectionName)}
                </Text>
                <View style={StatusCountRow.styles.visitBlockContainer}>
                    {visitBlocks}
                </View>
            </Fragment>
        );
    }
}

export default StatusCountRow;
