import _ from "lodash";

class StaticMenuItem {
    uniqueName;
    icon;
    displayKey;

    constructor(uniqueName, icon, displayKey) {
        this.uniqueName = uniqueName;
        this.icon = icon;
        this.displayKey = displayKey;
    }
}

export default StaticMenuItem;
