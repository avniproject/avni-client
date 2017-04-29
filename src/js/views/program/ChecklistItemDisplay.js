import {Text} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Card} from "native-base";

class ChecklistItemDisplay extends AbstractComponent {
    static propTypes = {
        checklistItem: React.PropTypes.object.isRequired,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Card style={this.appendedStyle({borderRadius: 4, height: 100, flexDirection: 'column', alignItems: 'center', backgroundColor: Colors.CardColor1})}>
                <Text style={{fontSize: Fonts.Medium}}>{this.I18n.t(this.props.checklistItem.concept.name)}</Text>
            </Card>
        );
    }
}

export default ChecklistItemDisplay;