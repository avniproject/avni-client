import _ from "lodash";
import {EkaAbhaError} from "../../../service/EkaAbhaClient";

// The steps of Avni's own ABHA verify screens (NHA's M1 cases VRFY_ABHA_101, 102, 303, 304 and 403), run on Eka's
// login calls. Kept apart from the screen so each case can be tested without React Native. Nothing the worker types
// (mobile, ABHA number or address, Aadhaar number, OTP) is put in the state the screen renders, logged, or kept after
// the screen closes: it lives in this object's private fields only.
export const STEPS = {
    METHOD: 'method', IDENTIFIER: 'identifier', OTP_CHOICE: 'otpChoice', PROFILES: 'profiles',
    OTP: 'otp', SELECT: 'select', NOT_FOUND: 'notFound', DONE: 'done',
};
export const METHODS = {MOBILE: 'mobile', ABHA_NUMBER: 'abha_number', ABHA_ADDRESS: 'abha_address', AADHAAR: 'aadhaar'};
export const OTP_SYSTEMS = {AADHAAR: 'aadhaar', MOBILE: 'abdm'};
// NHA: the OTP can be asked for again after 60 seconds, at most twice, and then a message.
export const RESEND_AFTER_MS = 60 * 1000;
export const MAX_RESENDS = 2;
// ABDM's answer when no ABHA is registered for the mobile or Aadhaar given.
export const NO_ABHA_CODES = ['ABDM-1114'];
// Maps the environment Eka's session names to the suffix of ABHA addresses there.
const ADDRESS_SUFFIX = {sandbox: '@sbx', production: '@abdm'};

// Aadhaar numbers carry a Verhoeff check digit, so a mistyped digit is caught before any OTP is sent.
const VERHOEFF_D = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
const VERHOEFF_P = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]];
export const verhoeffValid = (digits) => {
    let c = 0;
    const reversed = _.reverse(_.map(_.toString(digits).split(''), Number));
    reversed.forEach((d, i) => { c = VERHOEFF_D[c][VERHOEFF_P[i % 8][d]]; });
    return c === 0;
};

const digitsOf = (value) => _.toString(value).replace(/\D/g, '');

// The message key for a value the worker typed, or null when it can be sent.
export const validationKey = (method, value) => {
    const text = _.trim(value);
    switch (method) {
        case METHODS.MOBILE:
            return /^[6-9]\d{9}$/.test(text) ? null : 'abhaVerifyMobileInvalid';
        case METHODS.ABHA_NUMBER:
            return /^\d{14}$/.test(digitsOf(text)) && /^[\d\s-]+$/.test(text) ? null : 'abhaNumberInvalid';
        case METHODS.ABHA_ADDRESS:
            return /^[A-Za-z0-9][A-Za-z0-9_.]{2,30}[A-Za-z0-9](@(sbx|abdm))?$/.test(text) ? null : 'abhaVerifyAddressInvalid';
        case METHODS.AADHAAR:
            return /^[2-9]\d{11}$/.test(text) && verhoeffValid(text) ? null : 'abhaVerifyAadhaarInvalid';
        default:
            return 'abhaError';
    }
};

// 14 digits as ABDM writes them, 12-3456-7890-1234.
export const hyphenatedAbhaNumber = (value) => {
    const d = digitsOf(value);
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10, 14)}`;
};

// Thrown in place of a reply to a step the worker has left, so nothing acts on it.
const LEFT = new Error('ABHA verify step left');

const INITIAL = {
    step: STEPS.METHOD, method: null, busy: false, errorKey: null, errorDetail: null, hint: null,
    profiles: [], addresses: [], otpChoices: [], notFoundKind: null,
    resendsUsed: 0, resendAvailableAt: null, resendLimitReached: false,
};

class AbhaVerifyFlow {
    // onVerified(reply, method) gets Eka's reply holding the profile; onChange(state) re-renders the screen.
    constructor(client, {environment, onChange = _.noop, onVerified = _.noop, now = () => Date.now()} = {}) {
        this.client = client;
        // An unknown environment has no suffix to add: the worker types the whole address.
        this.suffix = ADDRESS_SUFFIX[environment] || '';
        this.onChange = onChange;
        this.onVerified = onVerified;
        this.now = now;
        this.state = {...INITIAL};
        // Raised by Back, a method choice and the screen closing; a reply to an earlier one is dropped.
        this.generation = 0;
        this.clearPrivate();
    }

    clearPrivate() {
        this.identifier = null;
        this.aadhaar = null;
        this.searchTxn = null;
        this.txn = null;
        this.lastInit = null;
        this.abhaNumberOfAddress = null;
    }

    set(patch) {
        this.state = {...this.state, ...patch};
        this.onChange(this.state);
    }

    // The Aadhaar typed on the Aadhaar route, for creating an ABHA when it holds none, so it is not asked again.
    aadhaarForCreate() {
        return this.state.step === STEPS.NOT_FOUND && this.state.notFoundKind === METHODS.AADHAAR ? this.aadhaar : null;
    }

    chooseMethod(method) {
        if (!_.includes(_.values(METHODS), method)) return;
        this.generation++;
        this.clearPrivate();
        this.set({...INITIAL, step: STEPS.IDENTIFIER, method});
    }

    // Back one step; from the first step the screen itself closes.
    back() {
        const {step} = this.state;
        if (step === STEPS.METHOD) return false;
        this.generation++;
        if (step === STEPS.IDENTIFIER) {
            this.clearPrivate();
            this.set({...INITIAL});
        } else {
            this.txn = null;
            this.set({...INITIAL, step: STEPS.IDENTIFIER, method: this.state.method});
        }
        return true;
    }

    // The screen has closed: no reply still to come is acted on, and nothing typed is kept.
    close() {
        this.generation++;
        this.clearPrivate();
    }

    // Eka's reply, or LEFT when the worker has left the step that asked, whether Eka answered or refused.
    async ask(call) {
        const generation = this.generation;
        let reply;
        try {
            reply = await call();
        } catch (error) {
            throw generation === this.generation ? error : LEFT;
        }
        if (generation !== this.generation) throw LEFT;
        return reply;
    }

    // Every action's failures end here, so a reply to a step left is dropped here.
    failed(error, fallbackKey = 'abhaVerifyFailed') {
        if (error === LEFT) return;
        if (error instanceof EkaAbhaError) {
            const unavailable = error.status === 0 || error.status >= 500;
            this.set({busy: false, errorKey: unavailable ? 'abhaEkaUnavailable' : fallbackKey,
                errorDetail: error.sourceCode || error.code || (error.status ? _.toString(error.status) : null)});
        } else {
            this.set({busy: false, errorKey: 'abhaError', errorDetail: null});
        }
    }

    static noAbha(error) {
        return error instanceof EkaAbhaError && (error.status === 404 || _.includes(NO_ABHA_CODES, error.sourceCode) || _.includes(NO_ABHA_CODES, error.code));
    }

    notFound(kind) {
        this.set({busy: false, step: STEPS.NOT_FOUND, notFoundKind: kind, errorKey: null, errorDetail: null});
    }

    // otpSystem is asked for with an ABHA number only: the worker picks Aadhaar OTP or mobile OTP.
    async submitIdentifier(value, otpSystem) {
        if (this.state.busy) return undefined;
        const {method} = this.state;
        const key = validationKey(method, value);
        if (key) {
            this.set({errorKey: key, errorDetail: null});
            return;
        }
        this.identifier = _.trim(value);
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            switch (method) {
                case METHODS.MOBILE:
                    return await this.search();
                case METHODS.ABHA_NUMBER:
                    return await this.sendOtp({method: 'abha_number', identifier: hyphenatedAbhaNumber(this.identifier),
                        otpSystem: otpSystem === OTP_SYSTEMS.AADHAAR ? OTP_SYSTEMS.AADHAAR : OTP_SYSTEMS.MOBILE});
                case METHODS.ABHA_ADDRESS:
                    return await this.addressMethods();
                case METHODS.AADHAAR:
                    this.aadhaar = this.identifier;
                    return await this.sendOtp({method: 'aadhaar_number', identifier: this.identifier, otpSystem: OTP_SYSTEMS.AADHAAR});
                default:
                    return undefined;
            }
        } catch (error) {
            if (method === METHODS.AADHAAR && AbhaVerifyFlow.noAbha(error)) return this.notFound(METHODS.AADHAAR);
            this.failed(error);
        }
        return undefined;
    }

    // VRFY_ABHA_303 and 304: the ABHAs on the mobile are listed before any OTP; with none, no OTP is sent at all.
    async search() {
        let reply;
        try {
            reply = await this.ask(() => this.client.search(this.identifier));
        } catch (error) {
            if (AbhaVerifyFlow.noAbha(error)) return this.notFound(METHODS.MOBILE);
            throw error;
        }
        const profiles = _.filter(_.isArray(reply.profiles) ? reply.profiles : [], (p) => !_.isNil(_.get(p, 'index')));
        if (_.isEmpty(profiles)) return this.notFound(METHODS.MOBILE);
        this.searchTxn = reply.txn_id || null;
        this.set({busy: false, step: STEPS.PROFILES, profiles: _.map(profiles, (p) => ({
            index: p.index, name: _.trim(p.name) || null, abhaNumber: _.trim(p.abha_number) || null,
            kycVerified: p.kyc_verified === true || p.kyc_verified === 'true',
        }))});
        return undefined;
    }

    async pickProfile(index) {
        if (this.state.busy || !_.find(this.state.profiles, {index})) return;
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            await this.sendOtp({method: 'search', identifier: index, txnId: this.searchTxn, otpSystem: OTP_SYSTEMS.MOBILE});
        } catch (error) {
            this.failed(error);
        }
    }

    // VRFY_ABHA_102: the OTP methods are the ones ABHA lists for the address.
    async addressMethods() {
        const address = _.includes(this.identifier, '@') ? this.identifier : this.identifier + this.suffix;
        this.identifier = address;
        const reply = await this.ask(() => this.client.methods(address));
        const listed = _.isArray(reply.auth_methods) ? reply.auth_methods : [];
        const blocked = _.isArray(reply.blocked_methods) ? reply.blocked_methods : [];
        const offered = (name) => _.includes(listed, name) && !_.includes(blocked, name);
        const otpChoices = _.compact([offered('AADHAAR_OTP') && OTP_SYSTEMS.AADHAAR, offered('MOBILE_OTP') && OTP_SYSTEMS.MOBILE]);
        this.abhaNumberOfAddress = _.trim(reply.abha_number) || null;
        if (_.isEmpty(otpChoices)) {
            this.set({busy: false, errorKey: 'abhaVerifyNoMethods', errorDetail: null});
            return;
        }
        this.set({busy: false, step: STEPS.OTP_CHOICE, otpChoices});
    }

    // An address's Aadhaar OTP goes through its ABHA number: on 3 Nov 2026 Eka's verify timed out (504) every time
    // for an address with the Aadhaar OTP, while the ABHA number with the Aadhaar OTP worked.
    async chooseOtpSystem(otpSystem) {
        if (this.state.busy || !_.includes(this.state.otpChoices, otpSystem)) return;
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            if (otpSystem === OTP_SYSTEMS.AADHAAR && this.abhaNumberOfAddress) {
                await this.sendOtp({method: 'abha_number', identifier: this.abhaNumberOfAddress, otpSystem});
            } else {
                await this.sendOtp({method: 'phr_address', identifier: this.identifier, otpSystem});
            }
        } catch (error) {
            this.failed(error);
        }
    }

    async sendOtp(params) {
        const reply = await this.ask(() => this.client.loginInit(params));
        this.lastInit = params;
        this.txn = reply.txn_id || null;
        this.set({busy: false, step: STEPS.OTP, hint: _.trim(reply.hint) || null, errorKey: null, errorDetail: null,
            resendsUsed: 0, resendAvailableAt: this.now() + RESEND_AFTER_MS, resendLimitReached: false});
    }

    canResend() {
        return this.state.step === STEPS.OTP && !this.state.busy && this.now() >= (this.state.resendAvailableAt || 0);
    }

    // The third ask shows the limit and makes no call.
    async resend() {
        if (!this.canResend()) return;
        if (this.state.resendsUsed >= MAX_RESENDS) {
            this.set({resendLimitReached: true, errorKey: 'abhaVerifyResendLimit', errorDetail: null});
            return;
        }
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            const reply = await this.ask(() => this.client.loginInit(this.lastInit));
            this.txn = reply.txn_id || this.txn;
            this.set({busy: false, hint: _.trim(reply.hint) || this.state.hint, resendsUsed: this.state.resendsUsed + 1,
                resendAvailableAt: this.now() + RESEND_AFTER_MS});
        } catch (error) {
            this.failed(error);
        }
    }

    // A wrong OTP keeps the transaction, so the worker can type it again.
    async submitOtp(otp) {
        if (this.state.busy) return undefined;
        if (!/^\d{6}$/.test(_.trim(otp))) {
            this.set({errorKey: 'abhaVerifyOtpInvalid', errorDetail: null});
            return;
        }
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            const reply = await this.ask(() => this.client.loginVerify({txnId: this.txn, otp: _.trim(otp)}));
            this.verified(reply);
        } catch (error) {
            if (this.state.method === METHODS.AADHAAR && AbhaVerifyFlow.noAbha(error)) return this.notFound(METHODS.AADHAAR);
            this.failed(error, 'abhaVerifyOtpFailed');
        }
        return undefined;
    }

    verified(reply) {
        this.txn = reply.txn_id || this.txn;
        const choices = _.isArray(reply.abha_profiles) ? reply.abha_profiles : [];
        if (reply.skip_state === 'abha_create' || (reply.skip_state === 'abha_select' && _.isEmpty(choices))) {
            return this.notFound(METHODS.AADHAAR);
        }
        if (reply.skip_state === 'abha_select') {
            this.set({busy: false, step: STEPS.SELECT, addresses: _.map(choices, (c, i) => ({
                i, abhaAddress: _.trim(c.abha_address) || null, name: _.trim(c.name) || null,
                kycVerified: _.includes([true, 'true', 'VERIFIED'], c.kyc_verified),
            }))});
            return undefined;
        }
        if (!_.isPlainObject(reply.profile)) {
            this.set({busy: false, errorKey: 'abhaNoProfile', errorDetail: null});
            return undefined;
        }
        this.set({busy: false, step: STEPS.DONE});
        const method = this.state.method;
        this.clearPrivate();
        this.onVerified(reply, method);
        return undefined;
    }

    async selectAddress(i) {
        const chosen = _.find(this.state.addresses, {i});
        if (this.state.busy || !chosen || !chosen.abhaAddress) return;
        this.set({busy: true, errorKey: null, errorDetail: null});
        try {
            this.verified(await this.ask(() => this.client.loginPhr({txnId: this.txn, abhaAddress: chosen.abhaAddress})));
        } catch (error) {
            this.failed(error);
        }
    }
}

export default AbhaVerifyFlow;
