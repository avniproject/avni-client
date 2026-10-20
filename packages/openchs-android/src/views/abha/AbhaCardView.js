import React from "react";
import {ActivityIndicator, Button, Image, PermissionsAndroid, SafeAreaView, ScrollView, Text, ToastAndroid, View} from "react-native";
import PropTypes from "prop-types";
import _ from "lodash";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import DeviceInfo from "react-native-device-info";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import AbhaService from "../../service/AbhaService";
import AbhaError from "../../service/AbhaError";
import AbhaProfile from "./AbhaProfile";

// The patient's ABHA card: Download, Share and Close. The card is the ABHA number, name, photo and QR code, so the
// image the app fetched lives in the cache folder only while this screen is open and is deleted when it closes.
// The only copy that stays is one the worker chose to download. Nothing here logs the card, its path or the
// number. The ABHA is never created or linked again from here: a failed fetch only offers Try again.
@Path('/abhaCard')
class AbhaCardView extends AbstractComponent {
    static propTypes = {
        subjectUUID: PropTypes.string.isRequired,
        // Names the downloaded file by the last four digits. Without it the file is abha-card.png.
        abhaNumber: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {status: 'loading', path: null, errorKey: null, downloadedName: null};
        this.unmounted = false;
    }

    viewName() {
        return 'AbhaCardView';
    }

    onViewDidMount() {
        this.fetchCard();
    }

    async fetchCard() {
        this.setState({status: 'loading', errorKey: null, downloadedName: null});
        let path;
        try {
            path = await this.getService(AbhaService).getCardFile(this.props.subjectUUID);
        } catch (error) {
            General.logWarn(this.viewName(), `ABHA card not fetched: ${AbhaError.messageKey(error)}`);
            if (!this.unmounted) this.setState({status: 'failed', errorKey: this.failureKey(error)});
            return;
        }
        if (this.unmounted) {
            await AbhaService.deleteCardFile(path);
            return;
        }
        this.setState({status: 'ready', path});
    }

    // A refusal the server named has its own message; everything else, including no network, is "could not be fetched".
    failureKey(error) {
        const key = AbhaError.messageKey(error);
        return key === 'abhaError' ? 'abhaCardFailed' : key;
    }

    componentWillUnmount() {
        this.unmounted = true;
        if (this.state.path) AbhaService.deleteCardFile(this.state.path);
        super.componentWillUnmount();
    }

    static downloadFileName(abhaNumber) {
        const digits = AbhaProfile.digitsOnly(abhaNumber);
        return digits ? `abha-card-${digits.slice(-4)}.png` : 'abha-card.png';
    }

    // Before Android 10 saving to the Downloads folder needs the storage permission; after it, none.
    async mayWriteDownloads() {
        const apiLevel = await DeviceInfo.getApiLevel();
        if (apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL) return true;
        const grant = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        return grant === true || grant === PermissionsAndroid.RESULTS.GRANTED;
    }

    async download() {
        const fileName = AbhaCardView.downloadFileName(this.props.abhaNumber);
        try {
            if (!(await this.mayWriteDownloads())) throw new Error('No permission to write to Downloads');
            await RNFS.copyFile(this.state.path, `${RNFS.DownloadDirectoryPath}/${fileName}`);
            this.setState({downloadedName: fileName});
        } catch (error) {
            General.logWarn(this.viewName(), `ABHA card not downloaded: ${error.message}`);
            ToastAndroid.show(this.I18n.t('abhaCardDownloadFailed'), ToastAndroid.LONG);
        }
    }

    async share() {
        try {
            await Share.open({url: `file://${this.state.path}`, type: 'image/png', failOnCancel: false});
        } catch (error) {
            // Closing the share sheet is not a failure.
            if (_.get(error, 'message') === 'User did not share') return;
            General.logWarn(this.viewName(), `ABHA card not shared: ${_.get(error, 'message')}`);
            ToastAndroid.show(this.I18n.t('abhaCardShareFailed'), ToastAndroid.LONG);
        }
    }

    renderBody() {
        const {status, path, errorKey, downloadedName} = this.state;
        if (status === 'loading') return <ActivityIndicator testID="abhaCardLoading" size="large" color={Colors.ActionButtonColor} style={{marginTop: 48}}/>;
        if (status === 'failed') {
            return (
                <View style={{padding: 16}}>
                    <Text style={{color: Colors.ValidationError, marginBottom: 16}}>{this.I18n.t(errorKey)}</Text>
                    <Button title={this.I18n.t('abhaCardTryAgain')} color={Colors.ActionButtonColor} onPress={() => this.fetchCard()}/>
                </View>
            );
        }
        return (
            <View style={{padding: 16}}>
                <Image testID="abhaCardImage" source={{uri: `file://${path}`}} resizeMode="contain" style={{width: '100%', aspectRatio: 1.6}}/>
                {downloadedName && <Text style={{marginTop: 12}}>{this.I18n.t('abhaCardDownloaded', {fileName: downloadedName})}</Text>}
                <View style={{marginTop: 16}}><Button title={this.I18n.t('abhaCardDownload')} color={Colors.ActionButtonColor} onPress={() => this.download()}/></View>
                <View style={{marginTop: 12}}><Button title={this.I18n.t('abhaCardShare')} color={Colors.ActionButtonColor} onPress={() => this.share()}/></View>
            </View>
        );
    }

    render() {
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaCardTitle')}/>
                <SafeAreaView style={{flex: 1}}>
                    <ScrollView>
                        {this.renderBody()}
                        <View style={{paddingHorizontal: 16, paddingBottom: 16}}>
                            <Button title={this.I18n.t('abhaCardClose')} color={Colors.ActionButtonColor} onPress={() => this.goBack()}/>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default AbhaCardView;
