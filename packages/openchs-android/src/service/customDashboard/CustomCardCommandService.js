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

// What a debug line may say about a value the page sent as an id. Debug lines can reach Bugsnag as breadcrumbs on a
// release build, so a value not shaped like an id, which could be a name, is described and never written.
function describeId(value) {
    if (_.isString(value) && UUID_SHAPE.test(value)) return value;
    if (_.isString(value)) return `a string of ${value.length} characters, not an id`;
    return `a value of type ${typeof value}, not an id`;
}

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
    const addressLevelService = service.getService(AddressLevelService);
    const addressLevel = _.isString(locationUUID) && UUID_SHAPE.test(locationUUID)
        ? addressLevelService.findByUUID(locationUUID) : null;
    if (_.isNil(addressLevel) || addressLevel.voided) {
        General.logDebug("CustomCardCommandService", `runCardAction - card "${cardName}": no location on this phone for ${describeId(locationUUID)} (target ${target})`);
        page.showMessage("recordNotOnThisPhone");
        return;
    }
    const filterConfigs = service.getService(DashboardFilterService).getFilterConfigsForDashboard(target);
    const overrides = {};
    _.forOwn(filterConfigs, (filterConfig, filterUUID) => {
        if (_.get(filterConfig, "type") === CustomFilter.type.Address) {
            // The location with its parents, from the top level down, as a choice on the Filter screen is stored, so
            // that screen shows it as chosen. Counts go by the lowest level, the location itself.
            overrides[filterUUID] = new AddressFilterValue([...addressLevelService.getParentsOfLeaf(addressLevel), addressLevel], []);
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
