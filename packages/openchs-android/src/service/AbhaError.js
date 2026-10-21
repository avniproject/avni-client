// A refusal from Avni's /abha endpoints, named by the code the server puts in its body
// (ABHA_NOT_CONFIGURED, ABHA_DISABLED, ABHA_NO_PRIVILEGE, ABHA_NO_HEALTH_CENTRE, ABHA_UNKNOWN_SUBJECT_TYPE, and
// ABHA_EKA_UNAVAILABLE when Eka refused or did not answer, ABHA_NOT_YOURS when the card of a patient not yet on the
// server is asked for by someone who did not record that patient's ABHA, ABHA_NO_CARD when the patient has no
// recorded ABHA to show a card for, ABHA_SESSION_EXPIRED when the patient's ABHA login at Eka has lapsed and the card
// needs the ABHA verified again, ABHA_NUMBER_INVALID when an ABHA number is not 14 digits). code is null when the body names none; a bare 404, which a wrong address or a
// proxy can give as well, is a general failure.
const MESSAGE_KEYS = {
    ABHA_NOT_CONFIGURED: 'abhaNotConfigured',
    ABHA_DISABLED: 'abhaDisabled',
    ABHA_NO_PRIVILEGE: 'abhaNoPermission',
    ABHA_NO_HEALTH_CENTRE: 'abhaNoHealthCentre',
    ABHA_UNKNOWN_SUBJECT_TYPE: 'abhaUnknownSubjectType',
    ABHA_EKA_UNAVAILABLE: 'abhaEkaUnavailable',
    ABHA_NOT_YOURS: 'abhaNotYours',
    ABHA_NO_CARD: 'abhaNoCard',
    ABHA_SESSION_EXPIRED: 'abhaCardSessionExpired',
    ABHA_NUMBER_INVALID: 'abhaNumberInvalid',
};

export default class AbhaError extends Error {
    constructor(code, status) {
        super(`ABHA refused: ${code || 'no reason given'} (Http ${status})`);
        this.name = 'AbhaError';
        this.code = code;
        this.status = status;
    }

    // The message for any failure to open the ABHA screen: each refusal has its own, anything else the general one.
    static messageKey(error) {
        return (error instanceof AbhaError && MESSAGE_KEYS[error.code]) || 'abhaError';
    }
}
