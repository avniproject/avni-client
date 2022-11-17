import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import React from "react";
import {Text, TouchableOpacity, View} from "react-native";
import Styles from "../primitives/Styles";

export default class CustomDashboardTab extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "CustomDashboardTab";
    }

    render() {
        const {uuid, name} = this.props.dashboard;
        const isSelected = uuid === this.props.activeDashboardUUID;
        const tabStyle = [{
            paddingHorizontal: 15,
            paddingBottom: 3,
            paddingTop: 2,
            marginTop: 10,
            marginHorizontal: 8,
            backgroundColor: Colors.cardBackgroundColor,
            borderWidth: 1,
            borderColor: Colors.InputBorderNormal,
            borderRadius: 15
        }, isSelected && {
            backgroundColor: Colors.SelectedTabColor
        }];
        return <View key={uuid}>
            <TouchableOpacity style={tabStyle}
                              onPress={() => this.props.onDashboardNamePress(uuid)}>
                <Text style={{
                    fontSize: Styles.titleSize,
                    color: isSelected ? Colors.headerTextColor : Colors.bottomBarIconColor
                }}>{this.I18n.t(name)}</Text>
            </TouchableOpacity>
        </View>
    }

}
