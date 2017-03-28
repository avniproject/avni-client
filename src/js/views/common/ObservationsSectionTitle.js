import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import ContextActionButton from '../primitives/ContextActionButton';

class ObservationsSectionTitle extends AbstractComponent {
    static propTypes = {
        titleKey: React.PropTypes.string.isRequired,
        contextActions: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{marginTop: DGS.resizeHeight(16), fontSize: 16}}>{this.I18n.t(`${this.props.titleKey}`)}</Text>
                {this.props.contextActions.map((contextAction, index) => {
                    return <ContextActionButton labelKey={contextAction.labelKey} onPress={() => contextAction.onPressFunc()} key={`${index}`}/>
                })}
            </View>
        );
    }
}

export default ObservationsSectionTitle;