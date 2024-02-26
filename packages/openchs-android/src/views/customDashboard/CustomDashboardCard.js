import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {CardTileView} from "./CardTileView";
import {CardListView} from "./CardListView";

export default class CustomDashboardCard extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "CustomDashboardCard";
    }

    render() {
        const {reportCard, index, viewType, onCardPress, countResult, countUpdateTime } = this.props;
        const onCardPressOp = _.debounce(onCardPress, 500);
        return viewType === 'Tile' ?
            <CardTileView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPressOp} index={index} countResult={countResult} /> :
            <CardListView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPressOp} countResult={countResult} />
    }

}
