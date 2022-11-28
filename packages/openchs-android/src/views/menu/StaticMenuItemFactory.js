import React from "react";
import StaticMenuItem from "./StaticMenuItem";
import FamilyFolderView from "../familyfolder/FamilyFolderView";
import VideoListView from "../videos/VideoListView";
import BeneficiaryModeStartView from "../beneficiaryMode/BeneficiaryModeStartView";
import EntitySyncStatusView from "../entitysyncstatus/EntitySyncStatusView";
import DevSettingsView from "../settings/DevSettingsView";
import CustomDashboardView from "../customDashboard/CustomDashboardView";

const FunctionalityMenus = [
    new StaticMenuItem("dashboard", "view-dashboard", "dashboards", StaticMenuItem.InternalNavigationMenuType, CustomDashboardView),
    new StaticMenuItem("videoList", "video", "VideoList", StaticMenuItem.InternalNavigationMenuType, VideoListView),
    new StaticMenuItem("beneficiaryMode", "account-supervisor", "beneficiaryMode", StaticMenuItem.InternalNavigationMenuType, BeneficiaryModeStartView)];
const SyncMenus = [
    new StaticMenuItem("entitySyncStatus", "sync", "entitySyncStatus", StaticMenuItem.InternalNavigationMenuType, EntitySyncStatusView),
    new StaticMenuItem("uploadCatchmentDatabase", "backup-restore", "uploadCatchmentDatabase", StaticMenuItem.CustomActionMenuType)
];
const UserMenus = [
    new StaticMenuItem("changePassword", "account-key", "changePassword", StaticMenuItem.CustomActionMenuType),
    new StaticMenuItem("logout", "logout", "logout", StaticMenuItem.CustomActionMenuType)
];
const SupportMenus = [
    new StaticMenuItem("uploadDatabase", "backup-restore", "uploadDatabase", StaticMenuItem.CustomActionMenuType)
];
const DevMenus = [
    new StaticMenuItem("deleteData", "delete", "Delete Data", StaticMenuItem.CustomActionMenuType),
    new StaticMenuItem("familyFolder", "account-multiple", "Family Folder", StaticMenuItem.InternalNavigationMenuType, FamilyFolderView),
    new StaticMenuItem("devSettings", "cog-outline", "Dev Settings", StaticMenuItem.InternalNavigationMenuType, DevSettingsView)
];

class StaticMenuItemFactory {
    static getFunctionalityMenus(beneficiaryModeStatus) {
        const menus = [...FunctionalityMenus];
        if (!beneficiaryModeStatus)
            _.remove(menus, (x) => x.uniqueName === "beneficiaryMode");
        return menus;
    }

    static getSyncMenus() {
        return [...SyncMenus];
    }

    static getUserMenus() {
        return [...UserMenus];
    }

    static getSupportMenus() {
        return [...SupportMenus];
    }

    static getDevMenus() {
        return __DEV__ ? [...DevMenus] : [];
    }
}

export default StaticMenuItemFactory;
