import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text} from "native-base";
import Fonts from "../primitives/Fonts";
import ChecklistItemDisplay from "./ChecklistItemDisplay";
import General from "../../utility/General";

class ChecklistDisplay extends AbstractComponent {
    static propTypes = {
        checklists: React.PropTypes.array.isRequired,
        editable: React.PropTypes.bool,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    isEditable() {
        return this.props.editable !== false;
    }

    render() {
        if (this.props.checklists.length === 0) return <View/>;

        return (
            <View style={this.appendedStyle()}>
                {this.props.checklists.map((checklist, checklistIndex) => {
                    const upcomingItems = checklist.upcomingItems();
                    return <View key={`c${checklistIndex}`}>
                        <Text style={{fontSize: Fonts.Large}}>{this.I18n.t('checklistPreview', {name: checklist.name, date: General.formatDate(upcomingItems[0][0].dueDate)})}</Text>
                        <View style={{flexDirection: 'row'}}>
                            {upcomingItems[0].map((checklistItem, checklistItemIndex) =>
                                <ChecklistItemDisplay checklistItem={checklistItem} key={`c${checklistIndex}-cli${checklistItemIndex}`} style={{marginLeft: 10}} editable={this.isEditable()}/>
                            )}
                        </View>
                    </View>
                })}
            </View>
        );
    }
}

export default ChecklistDisplay;