import {View, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ContextActionButton from "../primitives/ContextActionButton";
import Colors from "../primitives/Colors";

class ObservationsSectionOptions extends AbstractComponent {
    static propTypes = {
        primaryAction: PropTypes.object,
        contextActions: PropTypes.array.isRequired,
        style: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        let contextActionButtons = this.props.contextActions.map((contextAction, idx) => {
            return <ContextActionButton labelKey={contextAction.labelKey}
                                        onPress={() => contextAction.onPressFunc()}
                                        textColor={contextAction.color || Colors.VisitActionColor}
                                        key={idx}/>
        });
        let primaryAction = this.props.primaryAction;
        let primaryActionButton = primaryAction &&
            <ContextActionButton labelKey={primaryAction.labelKey} onPress={() => primaryAction.onPressFunc()}
                                 textColor={primaryAction.color || Colors.VisitActionColor}/>;
        return (
            <View style={this.appendedStyle({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end'
            })}>
                {primaryActionButton}
                {contextActionButtons}
            </View>
        );
    }
}

export default ObservationsSectionOptions;
