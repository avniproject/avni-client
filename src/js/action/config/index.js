import Actions from '../../action';
import ConfigService from "../../service/ConfigService";

const getConfig = function (state, action, beans) {
    return state;
};

export default new Map([[Actions.GET_CONFIG, getConfig]]);