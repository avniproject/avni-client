// A refusal from Avni's /abha endpoints, named by the code the server puts in its body
// (ABHA_NOT_CONFIGURED, ABHA_DISABLED, ABHA_NO_PRIVILEGE, ABHA_NO_HEALTH_CENTRE). code is null when the body names none.
const MESSAGE_KEYS = {
    ABHA_NOT_CONFIGURED: 'abhaNotConfigured',
    ABHA_DISABLED: 'abhaDisabled',
    ABHA_NO_PRIVILEGE: 'abhaNoPermission',
    ABHA_NO_HEALTH_CENTRE: 'abhaNoHealthCentre',
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
