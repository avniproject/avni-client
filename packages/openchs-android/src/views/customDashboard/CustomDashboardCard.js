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

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    render() {
        const {reportCard, index, viewType, onCardPress, countResult, countUpdateTime } = this.props;
        return viewType === 'Tile' ?
            <CardTileView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPress} index={index} countResult={countResult} /> :
            <CardListView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPress} countResult={countResult} />
    }

}
