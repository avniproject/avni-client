import _ from "lodash";

class StaticMenuItem {
    static InternalNavigationMenuType = "internal-navigation";
    static CustomActionMenuType = "custom";

    uniqueName;
    icon;
    displayKey;
    type;
    typeSpecificConfig;

    constructor(uniqueName, icon, displayKey, type, typeSpecificConfig) {
        this.uniqueName = uniqueName;
        this.icon = icon;
        this.displayKey = displayKey;
        this.type = type;
        this.typeSpecificConfig = typeSpecificConfig;
    }
}

export default StaticMenuItem;
