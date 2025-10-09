import React from 'react';
import {
    PermissionsAndroid,
    StyleSheet,
    TouchableNativeFeedback,
    TouchableOpacity,
    View,
} from 'react-native';
import DocumentPicker from '@react-native-documents/picker';
import AbstractFormElement from "./AbstractFormElement";
import Colors from "../../primitives/Colors";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ExpandableMedia from "../../common/ExpandableMedia";
import General from "../../../utility/General";
import FileSystem from "../../../model/FileSystem";
import {AlertMessage} from "../../common/AlertMessage";
import fs from "react-native-fs";
import {FileFormat} from 'avni-models';
import DeviceInfo from "react-native-device-info";
import _ from "lodash";

/**
 * FileFormElement - A React Native component for file selection and management
 * Supports single and multiple file selection with type and size validation
 * Follows Avni's offline-first architecture with proper error handling
 */
class FileFormElement extends AbstractFormElement {

    constructor(props, context) {
        super(props, context);
    }

    /**
     * Checks if storage permissions are granted for file operations
     * @returns {Promise<boolean>} True if permissions are granted or not needed (API 30+)
     */
    async isPermissionGranted() {
        const apiLevel = await DeviceInfo.getApiLevel();

        if (apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL) return true;

        const permissionRequest = await PermissionsAndroid.requestMultiple(
            [
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            ]
        );

        return _.every(permissionRequest, permission => permission === PermissionsAndroid.RESULTS.GRANTED);
    }

    /**
     * Generates a unique filename with original extension preserved
     * @param {string} name - Original filename
     * @returns {string} Unique filename with UUID and original extension
     */
    getFileName(name = "") {
        // Handle cases where name might be null, undefined, or empty
        if (!name || typeof name !== 'string') {
            return `${General.randomUUID()}`;
        }

        // Extract extension safely
        const parts = name.split(".");
        const extension = parts.length > 1 ? _.last(parts) : '';

        // Return filename with extension if available
        return extension ? `${General.randomUUID()}.${extension}` : General.randomUUID();
    }

    /**
     * Validates file type and size against form element constraints
     * @param {string} type - MIME type of the file
     * @param {number} size - File size in bytes
     * @throws {Error} If file doesn't meet validation criteria
     */
    checkFileSizeAndType(type, size) {
        const formElement = this.props.element;
        const allowedMaxSize = formElement.allowedMaxSize;
        const allowedTypes = formElement.allowedTypes;

        // Check if file type is provided
        if (_.isNil(type) || type === '') {
            throw new Error(this.I18n.t("noFileTypeErrorMessage"));
        }

        // Check if file type is allowed (only if allowedTypes is specified)
        if (!_.isEmpty(allowedTypes) && !_.includes(allowedTypes, type)) {
            const allowedTypeNames = allowedTypes.map(type => FileFormat.getName(type)).join(', ');
            throw new Error(this.I18n.t("FileTypeErrorMessage", {type, allowedTypeNames}));
        }

        // Check file size (only if allowedMaxSize is specified and size is valid)
        if (allowedMaxSize && _.isNumber(size) && size > 0 && size > allowedMaxSize) {
            const oneMBInBytes = 1000000;
            throw new Error(this.I18n.t("FileSizeErrorMessage", {
                size: (size / oneMBInBytes).toFixed(2),
                allowedMaxSize: (allowedMaxSize / oneMBInBytes).toFixed(2)
            }));
        }
    }

    /**
     * Handles file selection using DocumentPicker with modern async/await pattern
     * Maintains original UI/UX behavior - processes files sequentially and calls onUpdateObservations for each
     * @param {Function} onUpdateObservations - Callback to update form observations
     */
    async selectFile(onUpdateObservations) {
        const formElement = this.props.element;
        const applicableTypes = _.isEmpty(formElement.allowedTypes) ? [DocumentPicker.types.allFiles] : formElement.allowedTypes;
        const options = {type: applicableTypes, allowMultiSelection: formElement.isMultiSelect()};
        const directory = FileSystem.getFileDir();

        if (await this.isPermissionGranted()) {
            try {
                // Pick documents using modern async/await pattern
                const response = await DocumentPicker.pick(options);

                // Process files sequentially - matches original .map() behavior
                for (const responseItem of response) {
                    const {uri, copyError, type, name, size} = responseItem;

                    try {
                        // Validate file type and size (throws error if invalid)
                        this.checkFileSizeAndType(type, size);

                        if (name && uri && !copyError) {
                            const fileName = this.getFileName(name);
                            const destinationPath = `${directory}/${fileName}`;

                            // Copy file to app directory
                            await fs.copyFile(uri, destinationPath);

                            // Update observations for each successful file (original behavior)
                            onUpdateObservations(fileName);
                        }
                    } catch (fileError) {
                        // Show error but continue processing (matches original .map() behavior)
                        AlertMessage("Error while copying file", fileError.message);
                    }
                }
            } catch (err) {
                // Handle picker errors
                if (!DocumentPicker.isCancel(err)) {
                    AlertMessage(this.I18n.t("FileSelectionErrorTitle"), err.message);
                }
            }
        }
    }

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
