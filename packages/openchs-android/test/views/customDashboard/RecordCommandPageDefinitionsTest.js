import {RECORD_PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/RecordCommandPageDefinitions";

const evaluate = () => {
    const send = jest.fn();
    const avni = {};
    new Function('avni', 'send', RECORD_PAGE_COMMAND_DEFINITIONS.join('\n'))(avni, send);
    return {avni, send};
};

describe('record page command definitions', () => {
    it('sends openSubject with the uuid and the tab', () => {
        const {avni, send} = evaluate();
        avni.openSubject('s1', 'general');
        expect(send).toHaveBeenCalledWith('openSubject', {subjectUUID: 's1', tab: 'general'});
    });
    it('sends openEnrolment', () => {
        const {avni, send} = evaluate();
        avni.openEnrolment('e1');
        expect(send).toHaveBeenCalledWith('openEnrolment', {enrolmentUUID: 'e1'});
    });
    it('sends openVisit', () => {
        const {avni, send} = evaluate();
        avni.openVisit('v1');
        expect(send).toHaveBeenCalledWith('openVisit', {visitUUID: 'v1'});
    });
    it.each([
        ['editRegistration', 's1', {subjectUUID: 's1'}],
        ['editEnrolment', 'e1', {enrolmentUUID: 'e1'}],
        ['editExit', 'e1', {enrolmentUUID: 'e1'}],
        ['editVisit', 'v1', {visitUUID: 'v1'}],
    ])('sends %s with its one id', (name, id, args) => {
        const {avni, send} = evaluate();
        expect(avni[name]).toHaveLength(1);
        avni[name](id);
        expect(send).toHaveBeenCalledWith(name, args);
    });
});
