import React from 'react';
import {SafeAreaView, Text} from 'react-native';
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
// first result is acted on.
@Path('/abhaView')
class AbhaView extends AbstractComponent {
    static propTypes = {
        accessToken: PropTypes.string,
        sdkEnv: PropTypes.string,
        baseUrl: PropTypes.string,
        method: PropTypes.string,
        onProfile: PropTypes.func.isRequired,
        onSkip: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {error: null};
        this.resultHandled = false;
        this.html = buildAbhaHostHtml({
            sdkEnv: props.sdkEnv,
            method: props.method,
            initData: {accessToken: props.accessToken, skipABHAEnable: true},
        });
    }

    viewName() {
        return 'AbhaView';
    }

    static errorSummary(payload) {
        try {
            const parsed = _.isString(payload) ? JSON.parse(payload) : payload;
            return _.toString(_.get(parsed, 'error.message') || _.get(parsed, 'error') || 'unknown');
        } catch (e) {
            return 'unknown';
        }
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
                    this.setState({error: this.I18n.t('abhaNoProfile')});
                    return;
                }
                this.resultHandled = true;
                this.props.onProfile(profile);
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
                // Only the error text is logged: the payload can carry the partial API response.
                const summary = AbhaView.errorSummary(message.payload);
                General.logWarn(this.viewName(), `ABHA SDK error: ${summary}`);
                this.setState({error: `${this.I18n.t('abhaError')} (${summary})`});
                return;
            }
            default:
                return;
        }
    }

    render() {
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaTitle')}/>
                <SafeAreaView style={{flex: 1}}>
                    {this.state.error && <Text style={{padding: 16, color: Colors.ValidationError}}>{this.state.error}</Text>}
                    <WebView
                        source={{html: this.html, baseUrl: this.props.baseUrl}}
                        style={{flex: 1}}
                        originWhitelist={['https://*']}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowFileAccess={false}
                        allowFileAccessFromFileURLs={false}
                        allowUniversalAccessFromFileURLs={false}
                        onMessage={(event) => this.onMessage(event)}
                    />
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default AbhaView;
