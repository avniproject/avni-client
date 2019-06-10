import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ContextActionButton from "../primitives/ContextActionButton";

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
                                        key={idx}/>
        });
        let primaryAction = this.props.primaryAction;
        let primaryActionButton = primaryAction &&
            <ContextActionButton labelKey={primaryAction.labelKey} onPress={() => primaryAction.onPressFunc()}/>;
        return (
            <View style={this.appendedStyle({flexDirection: 'row', alignItems: 'center'})}>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 4, flexWrap: 'wrap'}}>
                    {contextActionButtons}
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 2, justifyContent: 'flex-end'}}>
                    {primaryActionButton}
                </View>
            </View>
        );
    }
}

export default ObservationsSectionOptions;
