import React from 'react';
import {
    PermissionsAndroid,
    StyleSheet,
    TouchableNativeFeedback,
    TouchableOpacity,
    View,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import AbstractFormElement from "./AbstractFormElement";
import Colors from "../../primitives/Colors";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ExpandableMedia from "../../common/ExpandableMedia";
import General from "../../../utility/General";
import FileSystem from "../../../model/FileSystem";
import {AlertMessage} from "../../common/AlertMessage";
import fs from "react-native-fs";
import {FileFormat} from 'avni-models';

class FileFormElement extends AbstractFormElement {

    constructor(props, context) {
        super(props, context);
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

    checkFileSizeAndType(type, size) {
        const formElement = this.props.element;
        const allowedMaxSize = formElement.allowedMaxSize;
        const allowedTypes = formElement.allowedTypes;
        if (_.isNil(type)) {
            AlertMessage(this.I18n.t("noFileTypeErrorMessage"));
        }
        if (!_.isEmpty(allowedTypes) && !_.includes(allowedTypes, type)) {
            const allowedTypeNames = allowedTypes.map(type => FileFormat.getName(type)).join(', ');
            throw Error(this.I18n.t("FileTypeErrorMessage", {type, allowedTypeNames}));
        }
        if (size > allowedMaxSize) {
            const oneMBInBytes = 1000000;
            throw Error(this.I18n.t("FileSizeErrorMessage", {
                size: (size / oneMBInBytes),
                allowedMaxSize: (allowedMaxSize / oneMBInBytes)
            }));
        }
    }

    async selectFile(onUpdateObservations) {
        const formElement = this.props.element;
        const applicableTypes = _.isEmpty(formElement.allowedTypes) ? [DocumentPicker.types.allFiles] : formElement.allowedTypes;
        const options = {type: applicableTypes};
        const directory = FileSystem.getFileDir();
        if (await this.isPermissionGranted()) {
            DocumentPicker.pickSingle(options)
                .then((response) => {
                    const {uri, copyError, type, name, size} = response;
                    this.checkFileSizeAndType(type, size);
                    if (name && uri && !copyError) {
                        const fileName = this.getFileName(name);
                        fs.copyFile(uri, `${directory}/${fileName}`)
                            .then(() => onUpdateObservations(fileName))
                            .catch(err => {
                                AlertMessage("Error while coping file", err.message);
                            })
                    }
                })
                .catch(err => {
                    if (!DocumentPicker.isCancel(err)) {
                        AlertMessage(this.I18n.t("FileSelectionErrorTitle"), err.message);
                    }
                })
        }
    };

    showInputOptions(onUpdateObservations) {
        return (
            <View style={[{
                justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'row',
                height: 40,
                marginTop: 16
            }]}>
                <TouchableOpacity onPress={() => this.selectFile(onUpdateObservations)}>
                    <Icon name={'folder-open'} style={[styles.icon, {marginRight: 3}]}/>
                </TouchableOpacity>
            </View>
        );
    }

    showMedia(mediaUri, onClearAnswer) {
        return (
            <View style={styles.content}>
                <ExpandableMedia source={mediaUri} type={this.props.element.concept.datatype}/>
                <TouchableNativeFeedback onPress={() => onClearAnswer()}>
                    <Icon name={"backspace"} style={[styles.icon]}/>
                </TouchableNativeFeedback>
            </View>
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
    }
});
