import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import ContextActionButton from "../primitives/ContextActionButton";
import Fonts from "../primitives/Fonts";

class ObservationsSectionTitle extends AbstractComponent {
    static propTypes = {
        title: React.PropTypes.string.isRequired,
        primaryAction: React.PropTypes.object,
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
        let primaryAction = this.props.primaryAction;
        let primaryActionButton = primaryAction &&
            <ContextActionButton labelKey={primaryAction.labelKey} onPress={() => primaryAction.onPressFunc()}/>
        return (
            <View style={this.appendedStyle({flexDirection: 'row', alignItems: 'center'})}>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 4, flexWrap: 'wrap'}}>
                    <Text style={[Fonts.MediumBold]}>{this.props.title}</Text>
                    {contextActionButtons}
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', flex: 2, justifyContent: 'flex-end'}}>
                    {primaryActionButton}
                </View>
            </View>
        );
    }
}

export default ObservationsSectionTitle;