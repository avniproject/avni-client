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

    componentWillMount() {
        super.componentWillMount();
    }

    render() {
        const {uuid, name} = this.props.dashboard;
        const isSelected = uuid === this.props.activeDashboardUUID;
        const tabStyle = [{paddingHorizontal: 10, margin: 5}, isSelected && {
            borderBottomWidth: 5,
            borderColor: Colors.iconSelectedColor
        }];
        return <View key={uuid} style={tabStyle}>
            <TouchableOpacity onPress={() => this.props.onDashboardNamePress(uuid)}>
                <Text style={{
                    fontSize: Styles.titleSize,
                    color: isSelected ? Colors.iconSelectedColor : Colors.bottomBarIconColor
                }}>{name}</Text>
            </TouchableOpacity>
        </View>
    }

}
