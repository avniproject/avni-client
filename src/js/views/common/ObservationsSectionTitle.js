import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import ContextActionButton from "../primitives/ContextActionButton";
import Fonts from "../primitives/Fonts";

class ObservationsSectionTitle extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        contextActions: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{fontSize: Fonts.Large}}>{this.props.title}</Text>
                <View style={{flex: 1, justifyContent: 'space-between', flexDirection: 'row'}}>
                    {this.props.contextActions.map((contextAction, index) => {
                        return <ContextActionButton labelKey={contextAction.labelKey} onPress={() => contextAction.onPressFunc()} key={`${index}`}/>
                    })}
                </View>
            </View>
        );
    }
}

export default ObservationsSectionTitle;