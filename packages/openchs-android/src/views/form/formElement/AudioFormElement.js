import PropTypes from 'prop-types';
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {PermissionsAndroid, StyleSheet, Text, TouchableNativeFeedback, TouchableOpacity, View} from "react-native";
import ValidationErrorMessage from "../ValidationErrorMessage";
import ExpandableMedia from "../../common/ExpandableMedia";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import IonIcons from 'react-native-vector-icons/Ionicons';
import Colors from "../../primitives/Colors";
import General from "../../../utility/General";
import FileSystem from "../../../model/FileSystem";
import fs from "react-native-fs";
import DocumentPicker from "react-native-document-picker";
import AudioRecorderPlayer, {
    AudioEncoderAndroidType,
    AudioSourceAndroidType,
} from 'react-native-audio-recorder-player';
import {ValidationResult} from "openchs-models";
import {AlertMessage} from "../../common/AlertMessage";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import DeviceInfo from "react-native-device-info";
import _ from "lodash";

class AudioFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };


    constructor(props, context) {
        super(props, context);
        this.state = {
            start: true,
            stop: false,
            recordTime: '00:00',
        };
        this.audioRecorderPlayer = new AudioRecorderPlayer();
    }

    get mediaUri() {
        return _.get(this, 'props.value.answer');
    }

    async isPermissionGranted() {
        const apiLevel = await DeviceInfo.getApiLevel();

        const permissionRequest = await PermissionsAndroid.requestMultiple(
            apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL ?
                [
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
                ]
                :
                [
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
                ]
        );

        return _.every(permissionRequest, permission => permission === PermissionsAndroid.RESULTS.GRANTED);
    }

    updateValue(value, validationResult = null) {
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            value,
            validationResult,
        });
    }

    clearAnswer() {
        this.updateValue(null);
        this.audioRecorderPlayer.removeRecordBackListener();
        this.setState({recordTime: '00:00'});
    }

    showMedia() {
        if (this.mediaUri) {
            return (
                <View style={[styles.contentRow, styles.imageRow, {height: 60}]}>
                    <ExpandableMedia source={this.mediaUri} type={this.props.element.concept.datatype}/>
                    <TouchableNativeFeedback onPress={() => this.clearAnswer()}>
                        <Icon name={"backspace"} style={[styles.icon]}/>
                    </TouchableNativeFeedback>
                </View>
            );
        }
    }

    async uploadFromFileSystem() {
        const formElement = this.props.element;
        const options = {type: DocumentPicker.types.audio, allowMultiSelection: formElement.isMultiSelect()};
        const fileName = `${General.randomUUID()}.mp3`;
        const directory = FileSystem.getAudioDir();
        if (await this.isPermissionGranted()) {
            DocumentPicker.pick(options)
                .then((response) => {
                    response.map(responseItem => {
                        const {uri, copyError, type} = responseItem;
                        if (_.isNil(type)) {
                            AlertMessage(this.I18n.t("audioFileTitle"), this.I18n.t("audioFileDescription"))
                        }
                        if (uri && type && !copyError) {
                            fs.copyFile(uri, `${directory}/${fileName}`)
                                .then(() => this.updateValue(fileName))
                        }
                    })
                }).catch(err => {
                if (!DocumentPicker.isCancel(err)) {
                    //Throw error only when user does not cancel it using back press
                    throw err;
                }
            })
        }
    }

    async onStart() {
        const directory = FileSystem.getAudioDir();
        const fileName = `${General.randomUUID()}.mp3`;
        const path = `${directory}/${fileName}`;
        if (await this.isPermissionGranted()) {
            const audioSet = {
                AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
                AudioSourceAndroid: AudioSourceAndroidType.MIC,
            };
            const uri = await this.audioRecorderPlayer.startRecorder(path, audioSet);
            this.updateValue(null, ValidationResult.failure(this.props.element.uuid, this.I18n.t("recordingStartedMessage")));
            this.setState({start: false, stop: true});
            General.logDebug('AudioFormElement', `Started recording audio at location ${uri}`);
            this.audioRecorderPlayer.addRecordBackListener((e: any) => {
                this.setState({
                    recordTime: this.audioRecorderPlayer.mmss(Math.floor(e.currentPosition/1000)),
                });
            });
        }
    }

    async onStop() {
        const filePath = await this.audioRecorderPlayer.stopRecorder();
        General.logDebug('AudioFormElement', `Recording saved at ${filePath}`);
        this.updateValue(filePath.replace(/^.*[\\\/]/, ''), ValidationResult.successful(this.props.element.uuid));
        this.audioRecorderPlayer.removeRecordBackListener();
        this.setState({start: true, stop: false});
    }

    showInputOptions() {
        const disabledColor = {color: Colors.DisabledButtonColor};
        const {start, stop} = this.state;
        return !this.mediaUri && (
            <View style={[styles.contentRow, {justifyContent: 'flex-end', alignItems: 'flex-end'}]}>
                <TouchableOpacity disabled={stop} onPress={() => this.uploadFromFileSystem()}>
                    <Icon name={'folder-open'} style={[styles.icon, stop ? disabledColor : {}, {marginRight: 3}]}/>
                </TouchableOpacity>
                <View style={styles.audioContainer}>
                    <Text style={styles.txtRecordCounter}>{this.state.recordTime}</Text>
                    <View style={[styles.contentRow, {justifyContent: 'flex-end', marginTop: 2}]}>
                        <TouchableOpacity disabled={stop} onPress={() => this.onStart()}>
                            <IonIcons name={'mic-circle'} style={[styles.icon, stop ? disabledColor : {}]}/>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={start} onPress={() => this.onStop()}>
                            <Icon name={'stop-circle'} style={[styles.icon, start ? disabledColor : {}]}/>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    render() {
        return (
            <View style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.showInputOptions()}
                {this.showMedia()}
                <View style={styles.lineStyle}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 36,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        marginTop: 16
    },
    imageRow: {
        justifyContent: 'space-between'
    },
    txtRecordCounter: {
        color: Colors.InputNormal,
        textAlignVertical: 'center',
        fontWeight: '200',
        letterSpacing: 3,
    },
    audioContainer: {
        flexDirection: 'column',
        borderColor: Colors.InputBorderNormal,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 1,
        alignItems: 'center',
    },
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1
    }
});

export default AudioFormElement;
