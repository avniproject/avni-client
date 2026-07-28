import StaticMenuItem from "./StaticMenuItem";
import FamilyFolderView from "../familyfolder/FamilyFolderView";
import VideoListView from "../videos/VideoListView";
import BeneficiaryModeStartView from "../beneficiaryMode/BeneficiaryModeStartView";
import EntitySyncStatusView from "../entitysyncstatus/EntitySyncStatusView";
import DevSettingsView from "../settings/DevSettingsView";
import CustomDashboardView from "../customDashboard/CustomDashboardView";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import _ from "lodash";

const FunctionalityMenus = [
    new StaticMenuItem("dashboard", "view-dashboard-outline", "dashboards", StaticMenuItem.InternalNavigationMenuType, CustomDashboardView),
    new StaticMenuItem("videoList", "play-circle-outline", "VideoList", StaticMenuItem.InternalNavigationMenuType, VideoListView),
    new StaticMenuItem("beneficiaryMode", "account-supervisor-outline", "beneficiaryMode", StaticMenuItem.InternalNavigationMenuType, BeneficiaryModeStartView)];
const SyncMenus = [
    new StaticMenuItem("entitySyncStatus", "sync-circle", "entitySyncStatus", StaticMenuItem.InternalNavigationMenuType, EntitySyncStatusView),
    new StaticMenuItem("uploadCatchmentDatabase", "backup-restore", "uploadCatchmentDatabase", StaticMenuItem.CustomActionMenuType)
];
const UserMenus = [
    new StaticMenuItem("changePassword", "form-textbox-password", "changePassword", StaticMenuItem.CustomActionMenuType),
    new StaticMenuItem("logout", "logout", "logout", StaticMenuItem.CustomActionMenuType)
];
const SupportMenus = [
    new StaticMenuItem("uploadAppInfo", "arrow-up-circle-outline", "uploadAppInfo", StaticMenuItem.CustomActionMenuType)
];
const DevMenus = [
    new StaticMenuItem("deleteData", "delete-outline", "Delete Data", StaticMenuItem.CustomActionMenuType),
    new StaticMenuItem("familyFolder", "account-multiple-outline", "Family Folder", StaticMenuItem.InternalNavigationMenuType, FamilyFolderView),
    new StaticMenuItem("devSettings", "cog-outline", "Dev Settings", StaticMenuItem.InternalNavigationMenuType, DevSettingsView),
    new StaticMenuItem("createAnonymizedDatabase", "incognito", "Anonymize Database", StaticMenuItem.CustomActionMenuType)
];

class StaticMenuItemFactory {
    static getFunctionalityMenus(beneficiaryModeStatus) {
        const menus = [...FunctionalityMenus];
        if (!beneficiaryModeStatus)
            this.removeMenuItem(menus, "beneficiaryMode");
        return menus;
    }

    static getSyncMenus(context) {
        if(context.getService(OrganisationConfigService).isDbEncryptionEnabled())
            this.removeMenuItem(SyncMenus, "uploadCatchmentDatabase");

        return [...SyncMenus];
    }

    static getUserMenus() {
        return [...UserMenus];
    }

    static getSupportMenus(context) {
        if(context.getService(OrganisationConfigService).isDbEncryptionEnabled())
            this.removeMenuItem(SupportMenus, "uploadAppInfo");

        return [...SupportMenus];
    }

    static getDevMenus() {
        return __DEV__ ? [...DevMenus] : [];
    }

    static removeMenuItem(menuItemList, menuItemName) {
        _.remove(menuItemList, menuItem => menuItem.uniqueName === menuItemName);
    }
}

export default StaticMenuItemFactory;
