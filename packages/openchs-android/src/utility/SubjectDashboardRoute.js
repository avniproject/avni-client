// Pure so a unit test can load it: CHSNavigator imports screens that call native modules on load.
export const subjectDashboardParams = (individualUUID, enrolmentUUID, backFunction, tab = 2) => {
    const params = {individualUUID, backFunction, tab};
    if (typeof enrolmentUUID === 'string' && enrolmentUUID !== '') {
        params.enrolmentUUID = enrolmentUUID;
    }
    return params;
};
