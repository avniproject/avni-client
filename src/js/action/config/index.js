import Actions from '../../action';
import ConfigService from "../../service/ConfigService";

const getConfig = function (state, action, beans) {
    beans.get(ConfigService).getAllFilesAndSave(action.cb);
    return state;
};

export default new Map([[Actions.GET_CONFIG, getConfig]]);