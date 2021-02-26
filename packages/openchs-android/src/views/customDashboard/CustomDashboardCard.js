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

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        setTimeout(() => this.dispatchAction(this.props.executeQueryActionName, {reportCardUUID: this.props.reportCard.uuid}), 1000);
    }

    render() {
        const {reportCard, index, viewType, onCardPress} = this.props;
        return viewType === 'Tile' ?
            <CardTileView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPress} index={index}/> :
            <CardListView reportCard={reportCard} I18n={this.I18n} onCardPress={onCardPress}/>
    }

}
