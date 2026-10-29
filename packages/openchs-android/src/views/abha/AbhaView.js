import React from 'react';
import {AppState, SafeAreaView, Text, ToastAndroid} from 'react-native';
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

// The page this screen builds is loaded from a string with no address, so the WebView reports it as about:blank,
// or by its origin, "null", on WebViews that pass messages by origin. A page with any other address is not ours.
export const HOSTED_PAGE_URLS = ['about:blank', 'null'];

// Runs Eka Care's ABHA SDK (create ABHA, or log in with an existing one) and hands the verified profile back
// through onProfile. The SDK may report a success through both window.EkaAbha and onSuccess, so only the
// first result is acted on. The session is the one AbhaService.getSession fetched as the screen opened; its key
// lives only in this screen's page.
@Path('/abhaView')
class AbhaView extends AbstractComponent {
    // Eka's key is not renewed while the screens are open, so they end a minute before it runs out.
    static END_BEFORE_EXPIRY_MS = 60 * 1000;

    static propTypes = {
        session: PropTypes.shape({
            accessToken: PropTypes.string,
            hipId: PropTypes.string,
            environment: PropTypes.string,
            expiresInSeconds: PropTypes.number,
        }).isRequired,
        method: PropTypes.string,
        // An ABHA address known before the screens open ("Checked in today", #2200). Eka's SDK takes it as identifier, of
        // identifier_type phr_address (eka-abdm plugin, abdm-m1-abha/references/web-sdk.md). How Eka's screens use it is
        // not yet seen in the sandbox.
        prefillAbhaAddress: PropTypes.string,
        onProfile: PropTypes.func.isRequired,
        onSkip: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {errorKey: null, errorDetail: null, sessionEnded: false};
        this.resultHandled = false;
        this.hostedPageLoaded = false;
        const {accessToken, hipId, environment} = props.session;
        try {
            const prefill = _.isEmpty(_.trim(props.prefillAbhaAddress)) ? {} : {identifier: _.trim(props.prefillAbhaAddress), identifier_type: 'phr_address'};
            this.html = buildAbhaHostHtml({
                environment,
                method: props.method,
                initData: {accessToken, hipId, skipABHAEnable: true, ...prefill},
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

    onViewDidMount() {
        const seconds = _.get(this.props, 'session.expiresInSeconds');
        if (!_.isFinite(seconds)) return;
        const usableMs = Math.max(0, seconds * 1000 - AbhaView.END_BEFORE_EXPIRY_MS);
        const endSession = () => {
            if (this.resultHandled) return;
            this.setState({sessionEnded: true});
        };
        this.sessionEndTimer = setTimeout(endSession, usableMs);
        // Timers stop while the phone sleeps, so the time spent is checked again on coming back.
        const openedAt = Date.now();
        this.appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active' && Date.now() - openedAt >= usableMs) endSession();
        });
    }

    componentWillUnmount() {
        clearTimeout(this.sessionEndTimer);
        if (this.appStateSubscription) this.appStateSubscription.remove();
        super.componentWillUnmount();
    }

    // Only Eka's error code is logged and shown, never its message: the payload can carry the partial API response,
    // and a message can quote a name, a date of birth or what the worker typed. A code is short, has no spaces, and
    // has a digit, a hyphen or an underscore, but no run of six digits that could be a number of the patient's. Null
    // when the error gives none.
    static errorCode(payload) {
        let parsed;
        try {
            parsed = _.isString(payload) ? JSON.parse(payload) : payload;
        } catch (e) {
            return null;
        }
        const isCode = (value) => (_.isString(value) || _.isInteger(value))
            && /^[A-Za-z0-9_.:-]{2,40}$/.test(_.toString(value)) && /[\d_-]/.test(_.toString(value)) && !/\d{6}/.test(_.toString(value));
        const code = _.find(['error.code', 'error.error_code', 'code', 'error_code'].map((path) => _.get(parsed, path)), isCode);
        return _.isNil(code) ? null : _.toString(code);
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

    // Only the page this screen built loads, and only once. Eka's screens run inside it and never navigate it, so
    // any other load, a link, a redirect or a script sending the WebView elsewhere, is refused.
    allowLoad(request) {
        if (!this.hostedPageLoaded && _.includes(HOSTED_PAGE_URLS, _.get(request, 'url'))) {
            this.hostedPageLoaded = true;
            return true;
        }
        General.logWarn(this.viewName(), 'Refused a page load in the ABHA screen');
        return false;
    }

    onMessage(event) {
        if (!_.includes(HOSTED_PAGE_URLS, _.get(event, 'nativeEvent.url'))) {
            General.logWarn(this.viewName(), 'Ignored a WebView message from a page other than the ABHA screen');
            return;
        }
        let message;
        try {
            message = JSON.parse(event.nativeEvent.data);
        } catch (e) {
            General.logWarn(this.viewName(), 'Ignored a WebView message that is not JSON');
            return;
        }
        if (!_.isPlainObject(message)) {
            General.logWarn(this.viewName(), 'Ignored a WebView message that is not an object');
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
                const code = AbhaView.errorCode(message.payload);
                General.logWarn(this.viewName(), `ABHA SDK error: ${code || 'no error code given'}`);
                this.setState({errorKey: 'abhaError', errorDetail: code});
                return;
            }
            default:
                return;
        }
    }

    render() {
        const {errorKey, errorDetail, sessionEnded} = this.state;
        const error = sessionEnded ? this.I18n.t('abhaSessionEnded')
            : errorKey && (errorDetail ? `${this.I18n.t(errorKey)} (${errorDetail})` : this.I18n.t(errorKey));
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaTitle')}/>
                <SafeAreaView style={{flex: 1}}>
                    {error && <Text style={{padding: 16, color: Colors.ValidationError}}>{error}</Text>}
                    {this.html && !sessionEnded && <WebView
                        source={{html: this.html}}
                        style={{flex: 1}}
                        originWhitelist={['https://*']}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={false}
                        allowFileAccessFromFileURLs={false}
                        allowUniversalAccessFromFileURLs={false}
                        onShouldStartLoadWithRequest={(request) => this.allowLoad(request)}
                        onLoadEnd={() => { this.hostedPageLoaded = true; }}
                        onMessage={(event) => this.onMessage(event)}
                    />}
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default AbhaView;
