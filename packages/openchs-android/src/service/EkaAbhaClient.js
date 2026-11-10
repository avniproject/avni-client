import _ from "lodash";
import General from "../utility/General";
import {resolveAbhaSdk} from "../views/abha/AbhaHostHtml";

// Eka Care's ABHA login calls, made from the phone with the same key and headers Eka's ABHA web SDK sends from its
// WebView (read from the @eka-care/abha 0.2.2 bundle; seen working from outside the WebView in the sandbox on 3 Nov 2026).
// The key comes from Avni's GET /abha/session. Aadhaar numbers, mobiles, ABHA numbers and addresses and OTPs go to Eka
// only: never to Avni's server, never into a log. Avni's own request helper is not used, because it adds Avni's
// auth token and logs failed replies.
export const EKA_LOGIN_PATHS = {
    search: '/abdm/v1/profile/search',
    methods: '/abdm/na/v1/profile/login/methods',
    init: '/abdm/na/v1/profile/login/init',
    verify: '/abdm/na/v1/profile/login/verify',
    phr: '/abdm/na/v1/profile/login/phr',
};
export const EKA_CALL_TIMEOUT_MS = 15000;

// What a failed call says: the HTTP status, Eka's code and ABDM's code (ABDM-1114 and the like). Eka's messages are
// kept out, because one can quote what the worker typed.
export class EkaAbhaError extends Error {
    constructor(call, status, code, sourceCode) {
        super(`Eka ${call} failed: ${status}${code ? ` ${code}` : ''}${sourceCode ? ` ${sourceCode}` : ''}`);
        this.call = call;
        this.status = status;
        this.code = code;
        this.sourceCode = sourceCode;
    }
}

// A code is short, has no spaces, and holds no run of six digits that could be a number of the patient's.
const safeCode = (value) => {
    const text = _.toString(value);
    return /^[A-Za-z0-9_.:-]{1,40}$/.test(text) && !/\d{6}/.test(text) ? text : null;
};

class EkaAbhaClient {
    constructor(session, fetchImpl = fetch) {
        const {accessToken, hipId, environment} = session;
        this.base = resolveAbhaSdk(environment).apiHosts[0];
        this.headers = {
            'Content-Type': 'application/json',
            'auth': accessToken,
            'client-id': 'ext',
            'X-Hip-Id': hipId,
            'X-ABHA-SDK-Version': '1.0.0',
        };
        this.fetch = fetchImpl;
    }

    async post(call, body) {
        const controller = typeof AbortController === 'undefined' ? null : new AbortController();
        const timer = setTimeout(() => controller && controller.abort(), EKA_CALL_TIMEOUT_MS);
        let response;
        try {
            response = await this.fetch(this.base + EKA_LOGIN_PATHS[call], {
                method: 'POST', headers: this.headers, body: JSON.stringify(body), signal: controller ? controller.signal : undefined,
            });
        } catch (e) {
            General.logWarn('EkaAbhaClient', `Eka ${call} not reached`);
            throw new EkaAbhaError(call, 0, null, null);
        } finally {
            clearTimeout(timer);
        }
        let reply = {};
        try {
            reply = await response.json();
        } catch (e) {
            reply = {};
        }
        if (!response.ok) {
            const error = new EkaAbhaError(call, response.status, safeCode(_.get(reply, 'code')), safeCode(_.get(reply, 'source_error.code')));
            General.logWarn('EkaAbhaClient', error.message);
            throw error;
        }
        return _.isPlainObject(reply) ? reply : {};
    }

    // KYC-verified ABHAs on a mobile, listed before any OTP: profiles [{index, name, abha_number (masked), gender,
    // kyc_verified}] and a txn_id. No ABHA can come back as null or empty profiles, or as an ABDM error.
    search(mobile) {
        return this.post('search', {mobile});
    }

    // How an ABHA address may log in: auth_methods (MOBILE_OTP, AADHAAR_OTP) and the ABHA number it belongs to.
    methods(abhaAddress) {
        return this.post('methods', {abha_address: abhaAddress});
    }

    // Sends the OTP: method search (identifier is the index the search listed, with its txn_id), abha_number,
    // phr_address, aadhaar_number or mobile; otpSystem abdm (the ABHA's mobile) or aadhaar. Answers {txn_id, hint}.
    loginInit({method, identifier, otpSystem, txnId}) {
        return this.post('init', _.omitBy({method, identifier: _.toString(identifier), otp_system: otpSystem, txn_id: txnId}, _.isNil));
    }

    // Answers skip_state abha_end with the profile and eka.oid, abha_select with abha_profiles to choose from, or
    // abha_create when the Aadhaar holds no ABHA.
    loginVerify({txnId, otp}) {
        return this.post('verify', {txn_id: txnId, otp});
    }

    // Completes an abha_select with the address chosen.
    loginPhr({txnId, abhaAddress}) {
        return this.post('phr', {txn_id: txnId, phr_address: abhaAddress});
    }
}

export default EkaAbhaClient;
