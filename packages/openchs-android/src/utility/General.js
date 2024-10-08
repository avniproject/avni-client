import {Concept, Duration, Observation} from 'avni-models';
import _ from 'lodash';
import moment from "moment";
import EnvironmentConfig from "../framework/EnvironmentConfig";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {JSONStringify} from "./JsonStringify";

let currentLogLevel;

function getDisplayMessage(obj) {
    if (obj && obj instanceof Error)
        return obj.message;
    if (typeof obj === 'object') {
        let s = JSON.stringify(obj);
        if (s === '{}') return obj;
        return s;
    }
    return obj;
}

function log(source, messages, level, decorate = false) {
    if (EnvironmentConfig.inNonDevMode()) return;

    try {
        const levelName = `${_.findKey(General.LogLevel, (value) => value === level)}`;
        const displayMessages = messages.map(getDisplayMessage);
        const headerOfMessage = `[${moment().format("h:mm:ss:SSS")}] [${source}][${levelName}]`;

        if (level >= General.getCurrentLogLevel()) {
            //https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
            if (decorate)
                console[levelName.toLowerCase()]("\x1b[43m\x1b[30m%s\x1b[0m", headerOfMessage, ...displayMessages);
            else
                console[levelName.toLowerCase()](headerOfMessage, ...displayMessages);
        }
    } catch (e) {
        console.error('General', `Logger failed for : 'General.log("${source}",....)' with error: "${e.message}"`, level);
    }
}

class General {
    static LogLevel = {
        Error: 4,
        Warn: 3,
        Info: 2,
        Debug: 1
    };

    static setCurrentLogLevel(level) {
        currentLogLevel = level;
    }

    static look(stuffToPrint) {
        General.logDebug('General', stuffToPrint);
        return stuffToPrint;
    }

    static getCurrentLogLevel() {
        return currentLogLevel;
    }

    static canLog(level) {
        return General.getCurrentLogLevel() <= level;
    }

    static formatDateTime(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    static isNilOrEmpty(value) {
        return _.isNil(value) || _.isEmpty(_.trim(value));
    }

    static getSafeTimeStamp() {
        return moment().format('MMM_Do_YYYY_h_mm_ss_a');
    }

    static hoursAndMinutesOfDateAreZero(date) {
        return date.getMinutes() === 0 && date.getHours() === 0;
    }

    static formatDate(date) {
        return _.isNil(date) ? "null" : `${General.toTwoChars(date.getDate())}-${General.toTwoChars(date.getMonth() + 1)}-${date.getFullYear()}`;
    }

    static to12HourDateTimeFormat(dateTime) {
        return moment(dateTime).format("lll");
    }

    static to12HourDateFormat(dateTime) {
        return moment(dateTime).format("ll");
    }

    static toISOFormatTime(hour, minute) {
        return moment({hour: hour, minute: minute}).format("HH:mm");
    }

    static toDisplayTime(isoFormatTime) {
        const time = this.toTimeObject(isoFormatTime);
        return moment(time).format("LT");
    }

    static toDisplayDateAsTime(date) {
        return moment(date).format("HH:mm")
    }

    static toNumericDateTimeFormat(dateTime) {
        //preferable for display to users as month names in other languages pose an additional barrier to usage
        return moment(dateTime).format("DD-MM-YYYY HH:mm");
    }

    static toNumericDateFormat(dateTime) {
        return moment(dateTime).format("DD-MM-YYYY");
    }

    static toDisplayDateAsTime12H(date) {
        return moment(date).format("hh:mm a")
    }

    static toTimeObject(isoFormatTime) {
        const timeArray = _.split(isoFormatTime, ':');
        return {hour: _.toInteger(timeArray[0]), minute: _.toInteger(timeArray[1])};
    }

    static toTwoChars(number) {
        return `${number}`.length === 1 ? `0${number}` : `${number}`;
    }

    static toDateFromTime(colonSeparatedTime) {
        const timeArray = _.split(colonSeparatedTime, ':');
        return moment({hour: timeArray[0], minute: timeArray[1]}).toDate();
    }

    static formatValue(value) {
        if (value instanceof Date) return General.formatDate(value);
        if (value instanceof Duration) return value.toString();
        if (!isNaN(value)) return value;
        return value;
    }

    static replaceAndroidIncompatibleChars(str) {
        const illegalCharacters = "|\\?*<\":>+[]/'";
        const array = illegalCharacters.split('');
        array.forEach(function (character) {
            str = str.replace(character, '_');
        });
        return str;
    }

    static toDisplayDate(date) {
        return moment(date).format('DD MMM YYYY');
    }

    static toDisplayDateTime(dateTime) {
        const DATE_TIME_FORMAT = `MMMM D, YYYY _hh:mm a`;
        return moment(dateTime)
            .format(DATE_TIME_FORMAT)
            .split("_");
    }

    static randomUUID() {
        return uuidv4();
    }

    static objectsShallowEquals(a: Object, b: Object): Boolean {
        return _.isNil(a) === _.isNil(b)
            && _.isEmpty(_.xor(_.keys(a), _.keys(b)))
            && _.every(_.keys(a), key => a[key] === b[key]);
    }

    static arraysShallowEquals(a: Array, b: Array, prop: String): Boolean {
        return _.isNil(a) === _.isNil(b)
            && _.size(a) === _.size(b)
            && _.isEmpty(_.xorBy(a, b, prop));
    }

    static dateWithoutTime(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    static toISTDate(x) {
        if (x && x.toString().includes("18:30:00"))
            return moment(x).add(330, "m").toDate();
        return x;
    }

    static datesAreSame(a, b) {
        return moment(General.toISTDate(a)).isSame(moment(General.toISTDate(b)), 'day');
    }

    static dateAIsAfterB(a, b) {
        if (_.isNil(a) || _.isNil(b)) return false;
        return moment(General.dateWithoutTime(a)).isAfter(General.dateWithoutTime(b));
    }

    static dateIsAfterToday(date) {
        return General.dateAIsAfterB(date, new Date());
    }

    static dateAIsBeforeB(a, b) {
        if (_.isNil(a) || _.isNil(b)) return false;
        return moment(General.dateWithoutTime(a)).isBefore(General.dateWithoutTime(b));
    }

    static logDebug(source, ...messages) {
        log(source, messages, General.LogLevel.Debug);
    }

    static logDebugTemp(source, ...messages) {
        log(source, messages, General.LogLevel.Debug, true);
    }

    static logDebugTempJson(source, message) {
        General.logDebugTemp(source, JSONStringify(message));
    }

    static logInfo(source, ...messages) {
        log(source, messages, General.LogLevel.Info);
    }

    static logWarn(source, ...messages) {
        log(source, messages, General.LogLevel.Warn);
    }

    static logError(source, error) {
        if (EnvironmentConfig.inNonDevMode()) return;

        if (General.LogLevel.Error >= General.getCurrentLogLevel()) {
            if (error && error.stack) {
                console["error"](source, `${error && error.message}, ${JSON.stringify(error)}`, error.stack);
            } else {
                console["error"](source, `${error && error.message}, ${JSON.stringify(error)}`);
            }
        }
    }

    static logErrorAsInfo(source, error) {
        if (EnvironmentConfig.inNonDevMode()) return;

        if (General.LogLevel.Error >= General.getCurrentLogLevel())
            console.log(`[${source}]`, error.message, JSON.stringify(error));
    }

    static isEmptyOrBlank(value) {
        return _.overSome([_.isNil, _.isNaN])(value) ? true :
            _.overSome([_.isNumber, _.isBoolean, _.isDate])(value) ? false :
                _.isEmpty(value);
    }

    static dlog(str, ...values) {
        console.log(_.pad(str, 40, '-'));
        console.log(...values);
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL = 33;

    static clearClipboard() {
        Clipboard.setString('');
    }

    static isDebugEnabled() {
        return currentLogLevel === General.LogLevel.Debug;
    }

    //from https://stackoverflow.com/questions/39085399/lodash-remove-items-recursively
    static deepOmit(obj, keysToOmit) {
        const keysToOmitIndex =  _.keyBy(Array.isArray(keysToOmit) ? keysToOmit : [keysToOmit] ); // create an index object of the keys that should be omitted

        function omitFromObject(obj) { // the inner function which will be called recursivley
            return _.transform(obj, function(result, value, key) { // transform to a new object
                if (key in keysToOmitIndex) { // if the key is in the index skip it
                    return;
                }

                result[key] = _.isObject(value) ? omitFromObject(value) : value; // if the key is an object run it through the inner function - omitFromObject
            })
        }

        return omitFromObject(obj); // return the inner function result
    }

    static logDebugStackTrace() {
        General.logDebug("General", General.stackTrace());
    }

    static stackTrace() {
        return new Error().stack;
    }
}

export default General;
