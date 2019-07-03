import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import ContextActionButton from "../primitives/ContextActionButton";
import Fonts from "../primitives/Fonts";

class ObservationsSectionTitle extends AbstractComponent {
    static propTypes = {
        title: PropTypes.string.isRequired,
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
                                        key={idx}/>
        });
        let primaryAction = this.props.primaryAction;
        let primaryActionButton = primaryAction &&
            <ContextActionButton labelKey={primaryAction.labelKey} onPress={() => primaryAction.onPressFunc()}/>;
        return (
            <View style={this.appendedStyle({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap'
            })}>
                <Text style={this.props.titleStyle || [Fonts.MediumBold]}>{this.props.title}</Text>
                {contextActionButtons}
                {primaryActionButton}
            </View>
        );
    }
}

export default ObservationsSectionTitle;
