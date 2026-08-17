import {StyleSheet, Text, View} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import PropTypes from 'prop-types';
import React from 'react';

class EntitySyncSummary extends AbstractComponent {
    static propTypes = {
        totalQueueCount: PropTypes.number
    };

    static defaultProps = {
        totalQueueCount: 0,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const queuedStyle = this.props.totalQueueCount > 0 ? {color: Colors.ValidationError} : {color: Colors.TextPrimaryDark};

        return (<View style={styles.card}>
            <Text style={styles.label}>
                {this.I18n.t('totalQueuedCount')}:
                <Text style={[styles.value, queuedStyle]}> {this.props.totalQueueCount}</Text>
            </Text>
            <Text style={[styles.label, {marginTop: 8}]}>
                {this.I18n.t('lastLoaded')}:
                <Text style={styles.value}> {this.props.lastLoaded}</Text>
            </Text>
        </View>);
    }

}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.WhiteContentBackground,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        borderRadius: 8,
        padding: 16,
        marginTop: 16
    },
    label: {
        fontSize: Styles.normalTextSize,
        color: Colors.TextSecondary
    },
    value: {
        fontSize: Styles.normalTextSize,
        color: Colors.TextPrimaryDark,
        fontWeight: '500'
    }
});

export default EntitySyncSummary;
