import React from "react";
import StaticMenuItem from "./StaticMenuItem";

const FunctionalityMenus = [
    new StaticMenuItem("dashboard", "view-dashboard", "dashboards"),
    new StaticMenuItem("videoList", "video-library", "VideoList"),
    new StaticMenuItem("beneficiaryMode", "account-supervisor", "beneficiaryMode")];
const SyncMenus = [
    new StaticMenuItem("entitySyncStatus","sync", "entitySyncStatus"),
    new StaticMenuItem("uploadCatchmentDatabase", "backup-restore", "uploadCatchmentDatabase")
];
const UserMenus = [
    new StaticMenuItem("changePassword", "account-key", "changePassword"),
    new StaticMenuItem("logout","logout", "logout")
];
const SupportMenus = [
    new StaticMenuItem("feedback", "comment-text-outline", "feedback"),
    new StaticMenuItem("uploadDatabase", "backup-restore", "uploadDatabase")
];
const DevMenus = [
    new StaticMenuItem("deleteData", "delete", "Delete Data"),
    new StaticMenuItem("familyFolder", "account-multiple", "Family Folder"),
    new StaticMenuItem("devSettings", "cog-outline", "Dev Settings")
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
