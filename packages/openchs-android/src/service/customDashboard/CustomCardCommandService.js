import _ from 'lodash';
import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";

// name -> (service, args, page) => void. A module's handler map is spread into this literal, so the map sits in one place
// and needs no other import to take effect.
// page is {view, reportCard, showMessage(i18nKey), navigate(navigateFrom)}, built by the card page.
export const COMMANDS = {};

@Service("customCardCommandService")
class CustomCardCommandService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    // Runs the command a card page asked for. Returns false, touching nothing, for a name that is not an own entry of the map.
    dispatch(message, page, commands = COMMANDS) {
        const name = message.avniCommand;
        if (!Object.prototype.hasOwnProperty.call(commands, name) || !_.isFunction(commands[name])) return false;
        const args = _.isPlainObject(message.args) ? message.args : {};
        commands[name](this, args, page);
        return true;
    }
}

export default CustomCardCommandService;
