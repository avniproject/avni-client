import React from "react";
import PropTypes from "prop-types";
import {StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import Colors from "../primitives/Colors";
import FileViewer from "react-native-file-viewer";
import {AlertMessage} from "./AlertMessage";
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {size} from 'lodash';

export default class ExpandableFile extends React.Component {
    static propTypes = {
        source: PropTypes.string,
        fileName: PropTypes.string
    };

    constructor(props) {
        super(props);
    }

    async openFile(sourceFile) {
        try {
            await FileViewer.open(sourceFile, {showOpenWithDialog: true});
        } catch (e) {
            AlertMessage("Error while opening the file", e.message)
        }
    };

    getDisplayFileName() {
        const originalName = this.props.fileName;
        const nameLength = size(originalName);
        const MAX_CHAR_ALLOWED = 12;
        if (nameLength > (MAX_CHAR_ALLOWED + 3)) {
            return `${originalName.substring(0, (MAX_CHAR_ALLOWED / 2) - 1)}...${originalName.substring(nameLength - MAX_CHAR_ALLOWED / 2)}`
        }
        return originalName;
    }

    render() {
        return <View style={{marginHorizontal: 5, marginVertical: 5}}>
            <TouchableNativeFeedback onPress={() => this.openFile(this.props.source)}>
                <View style={styles.previewContainer}>
                    <MaterialIcon style={styles.iconsStyle} name={'file-present'} size={35}/>
                    <Text>{this.getDisplayFileName()}</Text>
                </View>
            </TouchableNativeFeedback>
        </View>
    }
}

const styles = StyleSheet.create({
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SecondaryActionButtonColor,
        paddingVertical: 5,
        paddingHorizontal: 10,
        elevation: 2,
        borderWidth: 2,
        borderColor: Colors.InputBorderNormal,
    },
    iconsStyle: {
        marginRight: 5,
        color: Colors.DefaultPrimaryColor
    }
});
