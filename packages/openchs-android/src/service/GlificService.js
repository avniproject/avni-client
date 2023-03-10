import BaseService from './BaseService';
import Service from '../framework/bean/Service';
import SettingsService from './SettingsService';
import {getJSON} from '../framework/http/requests';

@Service("glificService")
class GlificService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.settingsService = this.getService(SettingsService);
        this.serverUrl = this.settingsService.getSettings().serverURL;
    }

    getAllMessagesForSubject(individualUUID) {
        return getJSON(`${this.serverUrl}/web/contact/subject/${individualUUID}/msgs`);
    }

    getAllMessagesForUser(userID) {
        return getJSON(`${this.serverUrl}/web/contact/user/${userID}/msgs`);
    }

    getAllMessagesNotYetSentForSubject(individualUUID) {
        return getJSON(`${this.serverUrl}/web/message/subject/${individualUUID}/msgsNotYetSent`);
    }

    getAllMessagesNotYetSentForUser(userID) {
        return getJSON(`${this.serverUrl}/web/message/user/${userID}/msgsNotYetSent`);
    }
}

export default GlificService;