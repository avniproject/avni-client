import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import ContextActionButton from "../primitives/ContextActionButton";
import Fonts from "../primitives/Fonts";

class ObservationsSectionTitle extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        contextActions: React.PropTypes.array.isRequired,
        style: React.PropTypes.object
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
        return (
            <View style={this.appendedStyle({flexDirection: 'row', alignItems: 'center'})}>
                <Text style={[Fonts.MediumBold, {marginRight: 10}]}>{this.props.title}</Text>
                <View style={{flex: 1, justifyContent: 'space-between', flexDirection: 'row'}}>
                    {contextActionButtons}
                </View>
            </View>
        );
    }
}

export default ObservationsSectionTitle;