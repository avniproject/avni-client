import React from 'react';
import {SafeAreaView, Text, ToastAndroid} from 'react-native';
import PropTypes from 'prop-types';
import {WebView} from 'react-native-webview';
import _ from 'lodash';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from '../../framework/routing/Path';
import CHSContainer from '../common/CHSContainer';
import AppHeader from '../common/AppHeader';
import Colors from '../primitives/Colors';
import General from '../../utility/General';
import AbhaProfile from './AbhaProfile';
import {ABHA_MESSAGE, buildAbhaHostHtml} from './AbhaHostHtml';

// Runs Eka Care's ABHA SDK (create ABHA, or log in with an existing one) and hands the verified profile back
// through onProfile. The SDK may report a success through both window.EkaAbha and onSuccess, so only the
// first result is acted on. The session is the one AbhaService.getSession fetched as the screen opened; its key
// lives only in this screen's page.
@Path('/abhaView')
class AbhaView extends AbstractComponent {
    static propTypes = {
        session: PropTypes.shape({
            accessToken: PropTypes.string,
            hipId: PropTypes.string,
            environment: PropTypes.string,
        }).isRequired,
        method: PropTypes.string,
        // For "Checked in today" (#2200); it reaches Eka's screens once the sandbox shows which key they read.
        prefillAbhaAddress: PropTypes.string,
        onProfile: PropTypes.func.isRequired,
        onSkip: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {errorKey: null, errorDetail: null};
        this.resultHandled = false;
        const {accessToken, hipId, environment} = props.session;
        try {
            this.html = buildAbhaHostHtml({
                environment,
                method: props.method,
                initData: {accessToken, hipId, skipABHAEnable: true},
            });
        } catch (e) {
            General.logWarn(this.viewName(), `ABHA screens not shown: ${e.message}`);
            this.html = null;
            this.state = {errorKey: 'abhaError', errorDetail: null};
        }
    }

    viewName() {
        return 'AbhaView';
    }

    // Only a short summary is logged: the payload can carry the partial API response, and Eka's message can quote
    // what the worker typed, so numbers of six or more digits and anything with an @ are masked.
    static errorSummary(payload) {
        let summary;
        try {
            const parsed = _.isString(payload) ? JSON.parse(payload) : payload;
            summary = _.toString(_.get(parsed, 'error.message') || _.get(parsed, 'error') || 'unknown');
        } catch (e) {
            return 'unknown';
        }
        return _.truncate(summary.replace(/\S*@\S*/g, '<address>').replace(/\d[\d\s-]{4,}\d/g, '<number>'), {length: 120});
    }

    // The registration takes the profile after this screen has closed, so a failure there is said in a toast. Only
    // a fixed line is logged: the failure can quote the patient's details.
    handBack(profile) {
        Promise.resolve()
            .then(() => this.props.onProfile(profile))
            .catch(() => {
                General.logWarn(this.viewName(), 'ABHA profile not taken by the registration');
                ToastAndroid.show(this.I18n.t('abhaError'), ToastAndroid.LONG);
            });
    }

    onMessage(event) {
        let message;
        try {
            message = JSON.parse(event.nativeEvent.data);
        } catch (e) {
            General.logWarn(this.viewName(), 'Ignored a WebView message that is not JSON');
            return;
        }
        switch (message.type) {
            case ABHA_MESSAGE.SUCCESS: {
                if (this.resultHandled) return;
                const profile = AbhaProfile.fromSdkPayload(message.payload);
                if (_.isNil(profile)) {
                    this.setState({errorKey: 'abhaNoProfile', errorDetail: null});
                    return;
                }
                this.resultHandled = true;
                this.handBack(profile);
                return;
            }
            case ABHA_MESSAGE.SKIP:
                if (this.resultHandled) return;
                this.resultHandled = true;
                this.props.onSkip();
                return;
            case ABHA_MESSAGE.CLOSE:
                if (!this.resultHandled) this.goBack();
                return;
            case ABHA_MESSAGE.ERROR: {
                const summary = AbhaView.errorSummary(message.payload);
                General.logWarn(this.viewName(), `ABHA SDK error: ${summary}`);
                this.setState({errorKey: 'abhaError', errorDetail: summary});
                return;
            }
            default:
                return;
        }
    }

    render() {
        const {errorKey, errorDetail} = this.state;
        const error = errorKey && (errorDetail ? `${this.I18n.t(errorKey)} (${errorDetail})` : this.I18n.t(errorKey));
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaTitle')}/>
                <SafeAreaView style={{flex: 1}}>
                    {error && <Text style={{padding: 16, color: Colors.ValidationError}}>{error}</Text>}
                    {this.html && <WebView
                        source={{html: this.html}}
                        style={{flex: 1}}
                        originWhitelist={['https://*']}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={false}
                        allowFileAccessFromFileURLs={false}
                        allowUniversalAccessFromFileURLs={false}
                        onMessage={(event) => this.onMessage(event)}
                    />}
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default AbhaView;
