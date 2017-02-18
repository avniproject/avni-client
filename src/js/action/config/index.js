import Actions from '../../action';
import ConfigFileService from "../../service/ConfigFileService";

const getConfig = function (state, action, beans) {
    beans.get(ConfigFileService).getAllFilesAndSave(action.cb, action.errorHandler);
    return state;
};

export default new Map([[Actions.GET_CONFIG, getConfig]]);