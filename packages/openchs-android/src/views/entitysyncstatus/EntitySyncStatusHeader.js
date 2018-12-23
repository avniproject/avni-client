import AbstractComponent from "../../framework/view/AbstractComponent";
import {StyleSheet, View} from "react-native";
import Cell from "./EntitySyncStatusCell";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import React from "react";

class EntitySyncStatusHeader extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        titles: React.PropTypes.array.isRequired,
        flexArr: React.PropTypes.array,
        style: View.propTypes.style
    };

    render() {
        const {titles, flexArr, style} = this.props;
        return <View style={[defaultStyles.header, style]}>
            {titles.map((titleKey, index) => {
                const flex = flexArr && flexArr[index];
                return <Cell key={`header${index}`} data={this.I18n.t(titleKey)} flex={flex}/>
            })}
        </View>;
    }
}

const defaultStyles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        overflow: 'hidden',
        height: 40,
        backgroundColor: '#f1f8ff',
        color: Colors.InputNormal,
        fontSize: Fonts.Normal
    }
});

export default EntitySyncStatusHeader;