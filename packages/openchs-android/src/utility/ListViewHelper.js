import _ from "lodash";
import ListView from "deprecated-react-native-listview";
import {getUnderlyingRealmCollection} from "openchs-models";

const rowNotChanged = function () {
    return false;
}

// ListView has the ability to render rows as they are displayed on the screen. ListView connection to realmList/realmResults allows for lazy loading. For performance reasons we cannot load all rows from db. This should be used only if realm collection (results or lists) are the rows. Along with using this, one should create the model object manually (see one example in the usage).
class ListViewHelper {
    static getDataSource(rows) {
        let dataSourceRows = getUnderlyingRealmCollection(rows);
        if (_.isNil(dataSourceRows))
            dataSourceRows = rows;
        return new ListView.DataSource({rowHasChanged: rowNotChanged}).cloneWithRows(dataSourceRows);
    }
}

export default ListViewHelper;
