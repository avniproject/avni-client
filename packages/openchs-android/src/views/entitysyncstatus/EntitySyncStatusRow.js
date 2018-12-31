import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import Styles from "../primitives/Styles";
import {StyleSheet, View} from "react-native";
import Cell from "./EntitySyncStatusCell";

class EntitySyncStatusRow extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        style: View.propTypes.style,
        flexArr: React.PropTypes.array,
        rowData: React.PropTypes.object
    };

    render() {
        const {rowData, flexArr, style} = this.props;
        const textStyle = rowData.queuedCount > 0 ? {color: Styles.redColor, paddingBottom:5} : {color: Styles.blackColor, paddingBottom:5};
        return (
            <View style={[defaultStyles.row, style]}>
                {
                    EntitySyncStatusRow.map(rowData, (value, index)=> <Cell key={index} data={value} flex={flexArr[index]} textStyle={textStyle}/>)
                }
            </View>);
    }

    static map(rowData, func) {
        const props = Object.keys(rowData);
        const result = [];

        props.forEach((key, index) => {
            result.push(func(rowData[key], index));
        });
        return result;
    }
}

const defaultStyles = StyleSheet.create({
    row: {
        height: 28,
        flexDirection: 'row',
        overflow: 'hidden'
    }
});

export default EntitySyncStatusRow;