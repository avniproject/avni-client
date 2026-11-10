import React from 'react';
import {ActivityIndicator, AppState, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'lodash';
import SmoothPinCodeInput from 'react-native-smooth-pincode-input';
import AbstractComponent from '../../../framework/view/AbstractComponent';
import Path from '../../../framework/routing/Path';
import CHSContainer from '../../common/CHSContainer';
import AppHeader from '../../common/AppHeader';
import Colors from '../../primitives/Colors';
import Distances from '../../primitives/Distances';
import EkaAbhaClient from '../../../service/EkaAbhaClient';
import AbhaProfile from '../AbhaProfile';
import AbhaVerifyFlow, {METHODS, OTP_SYSTEMS, STEPS} from './AbhaVerifyFlow';

const METHOD_LABELS = {
    [METHODS.MOBILE]: 'abhaVerifyMethodMobile', [METHODS.ABHA_NUMBER]: 'abhaVerifyMethodAbhaNumber',
    [METHODS.ABHA_ADDRESS]: 'abhaVerifyMethodAbhaAddress', [METHODS.AADHAAR]: 'abhaVerifyMethodAadhaar',
};
const PROMPTS = {
    [METHODS.MOBILE]: 'abhaVerifyEnterMobile', [METHODS.ABHA_NUMBER]: 'abhaVerifyEnterAbhaNumber',
    [METHODS.ABHA_ADDRESS]: 'abhaVerifyEnterAbhaAddress', [METHODS.AADHAAR]: 'abhaVerifyEnterAadhaar',
};
const OTP_LABELS = {[OTP_SYSTEMS.AADHAAR]: 'abhaVerifyAadhaarOtp', [OTP_SYSTEMS.MOBILE]: 'abhaVerifyMobileOtp'};

// Avni's own screens for verifying an ABHA a patient already has, by mobile, ABHA number, ABHA address or Aadhaar,
// in the order NHA tests (M1 cases VRFY_ABHA_101, 102, 303, 304 and 403). They call Eka's login service from the
// phone with the session AbhaService.getSession fetched; Eka's own screens stay for creating an ABHA. The profile goes
// back through onProfile as the SDK's does, so the registration takes it the same way.
@Path('/abhaVerifyView')
class AbhaVerifyView extends AbstractComponent {
    // Eka's key is not renewed while the screens are open, so they end a minute before it runs out.
    static END_BEFORE_EXPIRY_MS = 60 * 1000;

    static propTypes = {
        session: PropTypes.shape({
            accessToken: PropTypes.string,
            hipId: PropTypes.string,
            environment: PropTypes.string,
            expiresInSeconds: PropTypes.number,
        }).isRequired,
        onProfile: PropTypes.func.isRequired,
        // The patient holds no ABHA: create one on Eka's screens, with the Aadhaar typed here when there is one.
        onCreate: PropTypes.func.isRequired,
        onWithout: PropTypes.func.isRequired,
        // Tests pass their own; the app uses Eka's client.
        client: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
        const client = props.client || new EkaAbhaClient(props.session);
        this.flow = new AbhaVerifyFlow(client, {
            environment: props.session.environment,
            onChange: (flowState) => this.setState({flow: flowState}),
            onVerified: (reply, method) => this.handBack(reply, method),
        });
        this.state = {flow: this.flow.state, input: '', otp: '', sessionEnded: false, tick: 0};
    }

    viewName() {
        return 'AbhaVerifyView';
    }

    onViewDidMount() {
        this.ticker = setInterval(() => this.setState(({tick}) => ({tick: tick + 1})), 1000);
        const seconds = _.get(this.props, 'session.expiresInSeconds');
        if (!_.isFinite(seconds)) return;
        const usableMs = Math.max(0, seconds * 1000 - AbhaVerifyView.END_BEFORE_EXPIRY_MS);
        const endSession = () => this.setState({sessionEnded: true});
        this.sessionEndTimer = setTimeout(endSession, usableMs);
        // Timers stop while the phone sleeps, so the time spent is checked again on coming back.
        const openedAt = Date.now();
        this.appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active' && Date.now() - openedAt >= usableMs) endSession();
        });
    }

    componentWillUnmount() {
        clearInterval(this.ticker);
        clearTimeout(this.sessionEndTimer);
        if (this.appStateSubscription) this.appStateSubscription.remove();
        super.componentWillUnmount();
    }

    handBack(reply, method) {
        const profile = AbhaProfile.fromEkaLogin(reply, method);
        Promise.resolve()
            .then(() => this.props.onProfile(profile))
            .catch(() => this.setState({flow: {...this.flow.state, errorKey: 'abhaError', errorDetail: null}}));
    }

    onBack() {
        this.setState({input: '', otp: ''});
        if (!this.flow.back()) this.goBack();
    }

    submit(otpSystem) {
        const value = this.state.input;
        this.setState({input: ''});
        this.flow.submitIdentifier(value, otpSystem);
    }

    verifyOtp() {
        const otp = this.state.otp;
        this.setState({otp: ''});
        this.flow.submitOtp(otp);
    }

    button(titleKey, onPress, disabled = false) {
        return (
            <View style={styles.button} key={titleKey}>
                <Button title={this.I18n.t(titleKey)} color={Colors.ActionButtonColor} onPress={onPress} disabled={disabled}/>
            </View>
        );
    }

    renderMethod() {
        return (
            <View>
                <Text style={styles.prompt}>{this.I18n.t('abhaVerifyChooseMethod')}</Text>
                {_.map(_.values(METHODS), (method) => this.button(METHOD_LABELS[method], () => this.flow.chooseMethod(method)))}
            </View>
        );
    }

    renderIdentifier(flow) {
        const {method} = flow;
        const numeric = method !== METHODS.ABHA_ADDRESS;
        return (
            <View>
                <Text style={styles.prompt}>{this.I18n.t(PROMPTS[method])}</Text>
                <TextInput style={styles.input} value={this.state.input} autoFocus={true}
                           keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize="none" autoCorrect={false}
                           secureTextEntry={method === METHODS.AADHAAR}
                           maxLength={{[METHODS.MOBILE]: 10, [METHODS.AADHAAR]: 12, [METHODS.ABHA_NUMBER]: 17}[method] || 40}
                           onChangeText={(input) => this.setState({input})}/>
                {method === METHODS.ABHA_NUMBER
                    ? [this.button('abhaVerifyAadhaarOtp', () => this.submit(OTP_SYSTEMS.AADHAAR), flow.busy),
                        this.button('abhaVerifyMobileOtp', () => this.submit(OTP_SYSTEMS.MOBILE), flow.busy)]
                    : this.button('abhaVerifyContinue', () => this.submit(), flow.busy)}
            </View>
        );
    }

    renderOtpChoice(flow) {
        return (
            <View>
                <Text style={styles.prompt}>{this.I18n.t('abhaVerifyChooseOtp')}</Text>
                {_.map(flow.otpChoices, (choice) => this.button(OTP_LABELS[choice], () => this.flow.chooseOtpSystem(choice), flow.busy))}
            </View>
        );
    }

    renderChoices(rows, selectedKey, onSelect) {
        return _.map(rows, (row) => (
            <TouchableOpacity key={row.key} style={[styles.choice, selectedKey === row.key && styles.chosen]} onPress={() => onSelect(row.key)}>
                <Text style={styles.choiceTitle}>{row.title}</Text>
                {_.map(row.lines, (line) => <Text key={line}>{line}</Text>)}
            </TouchableOpacity>
        ));
    }

    renderProfiles(flow) {
        const rows = _.map(flow.profiles, (p) => ({key: p.index, title: p.name || '-',
            lines: _.compact([p.abhaNumber, p.kycVerified && this.I18n.t('abhaVerifyKyc')])}));
        return (
            <View>
                <Text style={styles.prompt}>{this.I18n.t('abhaVerifyChooseProfile')}</Text>
                {this.renderChoices(rows, this.state.picked, (picked) => this.setState({picked}))}
                {this.button('abhaVerifySendOtp', () => this.flow.pickProfile(this.state.picked), flow.busy || _.isNil(this.state.picked))}
            </View>
        );
    }

    renderSelect(flow) {
        const rows = _.map(flow.addresses, (a) => ({key: a.i, title: a.abhaAddress || '-',
            lines: _.compact([a.name, a.kycVerified && this.I18n.t('abhaVerifyKyc')])}));
        return (
            <View>
                <Text style={styles.prompt}>{this.I18n.t('abhaVerifyChooseAddress')}</Text>
                {this.renderChoices(rows, this.state.address, (address) => this.setState({address}))}
                {this.button('abhaVerifyContinue', () => this.flow.selectAddress(this.state.address), flow.busy || _.isNil(this.state.address))}
            </View>
        );
    }

    renderOtp(flow) {
        const waitMs = Math.max(0, (flow.resendAvailableAt || 0) - Date.now());
        return (
            <View>
                {flow.hint && <Text style={styles.prompt}>{flow.hint}</Text>}
                <Text style={styles.prompt}>{this.I18n.t('abhaVerifyEnterOtp')}</Text>
                <View style={styles.pin}>
                    <SmoothPinCodeInput codeLength={6} value={this.state.otp} autoFocus={true} password={true} mask="•"
                                        onTextChange={(otp) => this.setState({otp})}/>
                </View>
                {this.button('abhaVerifyVerify', () => this.verifyOtp(), flow.busy || this.state.otp.length < 6)}
                {flow.resendLimitReached ? null : waitMs > 0
                    ? <Text style={styles.centred}>{this.I18n.t('abhaVerifyResendIn', {seconds: Math.ceil(waitMs / 1000)})}</Text>
                    : <TouchableOpacity onPress={() => this.flow.resend()} disabled={flow.busy}>
                        <Text style={[styles.centred, styles.link]}>{this.I18n.t('abhaVerifyResend')}</Text>
                    </TouchableOpacity>}
            </View>
        );
    }

    renderNotFound(flow) {
        return (
            <View>
                <Text style={styles.notFound}>{this.I18n.t(flow.notFoundKind === METHODS.AADHAAR ? 'abhaVerifyAadhaarNotFound' : 'abhaVerifyMobileNotFound')}</Text>
                {this.button('abhaVerifyCreate', () => this.props.onCreate(this.flow.aadhaarForCreate()))}
                {this.button('abhaOptionWithout', () => this.props.onWithout())}
            </View>
        );
    }

    renderStep(flow) {
        switch (flow.step) {
            case STEPS.METHOD: return this.renderMethod();
            case STEPS.IDENTIFIER: return this.renderIdentifier(flow);
            case STEPS.OTP_CHOICE: return this.renderOtpChoice(flow);
            case STEPS.PROFILES: return this.renderProfiles(flow);
            case STEPS.OTP: return this.renderOtp(flow);
            case STEPS.SELECT: return this.renderSelect(flow);
            case STEPS.NOT_FOUND: return this.renderNotFound(flow);
            default: return null;
        }
    }

    render() {
        const {flow, sessionEnded} = this.state;
        const error = sessionEnded ? this.I18n.t('abhaSessionEnded')
            : flow.errorKey && (flow.errorDetail ? `${this.I18n.t(flow.errorKey)} (${flow.errorDetail})` : this.I18n.t(flow.errorKey));
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('abhaTitle')} func={() => this.onBack()}/>
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
                    {error && <Text style={styles.error}>{error}</Text>}
                    {!sessionEnded && this.renderStep(flow)}
                    {flow.busy && <ActivityIndicator size="large" color={Colors.ActionButtonColor} style={styles.busy}/>}
                </ScrollView>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    body: {paddingHorizontal: Distances.ScaledContentDistanceFromEdge, paddingTop: 16},
    prompt: {fontSize: 16, marginBottom: 12},
    input: {borderWidth: 1, borderColor: '#999', borderRadius: 4, padding: 10, fontSize: 18, marginBottom: 16},
    button: {marginBottom: 12},
    choice: {borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 12, marginBottom: 8},
    chosen: {borderColor: Colors.ActionButtonColor, borderWidth: 2},
    choiceTitle: {fontSize: 16, fontWeight: 'bold'},
    pin: {alignSelf: 'center', marginVertical: 16},
    centred: {alignSelf: 'center', marginTop: 12},
    link: {color: Colors.ActionButtonColor},
    notFound: {fontSize: 16, marginBottom: 16},
    error: {color: Colors.ValidationError, marginBottom: 12},
    busy: {marginTop: 16},
});

export default AbhaVerifyView;
