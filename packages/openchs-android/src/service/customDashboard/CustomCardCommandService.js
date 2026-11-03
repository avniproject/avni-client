import _ from 'lodash';
import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {CustomFilter} from "openchs-models";
import CustomDashboardService, {isDashboardAvailableToUser} from "./CustomDashboardService";
import DashboardFilterService from "../reports/DashboardFilterService";
import AddressLevelService from "../AddressLevelService";
import AddressFilterValue from "../../model/AddressFilterValue";
import General from "../../utility/General";

// name -> (service, args, page) => void. A module's handler map is spread into this literal, so the map sits in one place
// and needs no other import to take effect.
// page is {view, reportCard, showMessage(i18nKey), navigate(navigateFrom), sourceDashboardUUID, openDashboard(target, beforeOpen)},
// built by the card page.

// A value that is not shaped like a uuid must never reach a query: a quote in it would break the query.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A card with the Open dashboard action, opened for the location the page names. The checks all come before the opening,
// and the filters are carried inside it, so a link dropped while another command opens a screen changes no filters.
function runCardAction(service, args, page) {
    const cardName = page.reportCard.name;
    if (!page.reportCard.isActionOpenDashboard()) {
        General.logDebug("CustomCardCommandService", `runCardAction - card "${cardName}" does not have the Open dashboard action, ignored`);
        return;
    }
    const target = page.reportCard.actionDetailDashboardUUID;
    const customDashboardService = service.getService(CustomDashboardService);
    if (!isDashboardAvailableToUser(customDashboardService, target)) {
        General.logDebug("CustomCardCommandService", `runCardAction - card "${cardName}": target ${target} is not available to this user`);
        page.showMessage("dashboardNotAvailableToUser");
        return;
    }
    const locationUUID = _.get(args, "locationUUID");
    const addressLevel = _.isString(locationUUID) && UUID_SHAPE.test(locationUUID)
        ? service.getService(AddressLevelService).findByUUID(locationUUID) : null;
    if (_.isNil(addressLevel) || addressLevel.voided) {
        General.logDebug("CustomCardCommandService", `runCardAction - card "${cardName}": location ${_.isString(locationUUID) ? locationUUID : typeof locationUUID} is not on this phone (target ${target})`);
        page.showMessage("recordNotOnThisPhone");
        return;
    }
    const filterConfigs = service.getService(DashboardFilterService).getFilterConfigsForDashboard(target);
    const overrides = {};
    _.forOwn(filterConfigs, (filterConfig, filterUUID) => {
        if (_.get(filterConfig, "type") === CustomFilter.type.Address) {
            overrides[filterUUID] = new AddressFilterValue([addressLevel], []);
        }
    });
    General.logDebug("CustomCardCommandService", `runCardAction - card "${cardName}": opening ${target} for location ${locationUUID}`);
    page.openDashboard(target, () =>
        customDashboardService.carryFiltersOver(page.sourceDashboardUUID || target, target, overrides));
}

export const COMMANDS = {
    runCardAction,
};

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
