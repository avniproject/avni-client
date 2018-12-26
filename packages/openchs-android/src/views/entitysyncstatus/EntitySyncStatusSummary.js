import {Text, View} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Styles from "../primitives/Styles";
import React from 'react';

class EntitySyncSummary extends AbstractComponent {
    static propTypes = {
        totalQueueCount: React.PropTypes.number
    };

    static defaultProps = {
        totalQueueCount: 0,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const queuedStyle = this.props.totalQueueCount > 0 ? {color: Styles.redColor} : {color: Styles.blackColor};

        return (<View style={Styles.listContainer}>
            <Text style={Styles.textList}>
                {this.I18n.t('totalQueuedCount')}:
                <Text style={[{fontSize: Styles.normalTextSize},queuedStyle]}>{this.props.totalQueueCount}</Text>
            </Text>
            <Text style={Styles.textList}>
                {this.I18n.t('lastLoaded')}:
                <Text style={{fontSize: Styles.normalTextSize}}>{this.props.lastLoaded}</Text>
            </Text>
        </View>);
    }

}
export default EntitySyncSummary;