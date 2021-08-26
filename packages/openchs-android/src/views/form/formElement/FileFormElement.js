import React from 'react';
import {
    PermissionsAndroid,
    SafeAreaView,
    StyleSheet,
    TouchableNativeFeedback,
    TouchableOpacity,
    View,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import Colors from "../../primitives/Colors";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ExpandableMedia from "../../common/ExpandableMedia";
import ValidationErrorMessage from "../ValidationErrorMessage";
import General from "../../../utility/General";
import FileSystem from "../../../model/FileSystem";
import {AlertMessage} from "../../common/AlertMessage";
import fs from "react-native-fs";

class FileFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    get mediaUri() {
        return _.get(this, 'props.value.answer');
    }

    async isPermissionGranted() {
        const readStoragePermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const writeStoragePermission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
        const granted = PermissionsAndroid.RESULTS.GRANTED;
        const permissionRequest = await PermissionsAndroid.requestMultiple([readStoragePermission, writeStoragePermission]);
        return permissionRequest[readStoragePermission] === granted && permissionRequest[writeStoragePermission] === granted
    }

    getFileName(name = "") {
        const extension = _.last(name.split("."));
        return `${General.randomUUID()}.${extension || ''}`
    }

    async selectFile() {
        const options = {type: DocumentPicker.types.allFiles};
        const directory = FileSystem.getFileDir();
        if (await this.isPermissionGranted()) {
            DocumentPicker.pick(options)
                .then(({uri, copyError, type, name, size}) => {
                    if (_.isNil(type)) {
                        AlertMessage("Please select a", "Please select a file");
                    }
                    if (name && uri && type && !copyError) {
                        const fileName = this.getFileName(name);
                        fs.copyFile(uri, `${directory}/${fileName}`)
                            .then(() => this.updateValue(fileName))
                            .catch(err => {
                                AlertMessage("error while coping file", err.message)
                            })
                    }
                })
                .catch(err => {
                    if (!DocumentPicker.isCancel(err)) {
                        //Throw error only when user does not cancel it using back press
                        throw err;
                    }
                })
        }
    };

    showInputOptions() {
        return !this.mediaUri && (
            <View style={[{
                justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'row',
                height: 40,
                marginTop: 16
            }]}>
                <TouchableOpacity onPress={() => this.selectFile()}>
                    <Icon name={'folder-open'} style={[styles.icon, {marginRight: 3}]}/>
                </TouchableOpacity>
            </View>
        );
    }

    showMedia() {
        if (this.mediaUri) {
            return (
                <View style={styles.content}>
                    <ExpandableMedia source={this.mediaUri} type={this.props.element.concept.datatype}/>
                    <TouchableNativeFeedback onPress={() => this.updateValue(null)}>
                        <Icon name={"backspace"} style={[styles.icon]}/>
                    </TouchableNativeFeedback>
                </View>
            );
        }
    }

    updateValue(value) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            value,
        });
    }

    render() {
        return (
            <SafeAreaView>
                {this.label}
                {this.showInputOptions()}
                {this.showMedia()}
                <View style={styles.lineStyle}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </SafeAreaView>
        );
    }
}

export default FileFormElement;

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 36,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        marginRight: 10,
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1
    }
});
