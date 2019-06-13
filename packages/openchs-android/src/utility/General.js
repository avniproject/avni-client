import {Duration, Observation, Concept} from 'openchs-models';
import _ from 'lodash';
import moment from "moment";

var currentLogLevel;

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

    static getTimeStamp() {
        var date = new Date();
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var hour = date.getHours();
        var min = date.getMinutes();
        var sec = date.getSeconds();

        month = (month < 10 ? "0" : "") + month;
        day = (day < 10 ? "0" : "") + day;
        hour = (hour < 10 ? "0" : "") + hour;
        min = (min < 10 ? "0" : "") + min;
        sec = (sec < 10 ? "0" : "") + sec;

        return `${day}-${month}-${date.getFullYear()} ${hour}:${min}:${sec}`;
    }

    static hoursAndMinutesOfDateAreZero(date) {
        return date.getMinutes() === 0 && date.getHours() === 0;
    }

    static formatDate(date) {
        return `${General.toTwoChars(date.getDate())}-${General.toTwoChars(date.getMonth() + 1)}-${date.getFullYear()}`;
    }

    static formatDateTime(date) {
      const hour = General.toTwoChars(date.getHours());
      const minutes = General.toTwoChars(date.getMinutes());

      return `${General.toTwoChars(date.getDate())}-${General.toTwoChars(date.getMonth() + 1)}-${date.getFullYear()} ${hour}:${minutes}`;
    }

    static isoFormat(date) {
        return `${date.getFullYear()}-${General.toTwoChars(date.getMonth() + 1)}-${General.toTwoChars(date.getDate())}`;
    }

    static toISOFormatTime(hour, minute){
        return moment({hour: hour, minute:minute}).format("HH:mm");
    }

    static toDisplayTime(isoFormatTime){
        const time = this.toTimeObject(isoFormatTime);
        return moment(time).format("LT");
    }

    static toTimeObject(isoFormatTime) {
        const timeArray = _.split(isoFormatTime, ':');
        return {hour: _.toInteger(timeArray[0]), minute: _.toInteger(timeArray[1])};
    }

    static toTwoChars(number) {
        return `${number}`.length === 1 ? `0${number}` : `${number}`;
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
        return moment(date).format('DD-MMM-YYYY');
    }

    static assignDateFields(dateFields, source, dest) {
        if (!_.isNil(dateFields)) {
            dateFields.forEach((fieldName) => {
                dest[fieldName] = _.isNil(source[fieldName])? null: new Date(source[fieldName]);
            });
        }
    }

    static assignFields(source, dest, directCopyFields, dateFields, observationFields, entityService) {
        if (!_.isNil(directCopyFields)) {
            directCopyFields.forEach((fieldName) => {
                dest[fieldName] = source[fieldName];
            });
        }
        General.assignDateFields(dateFields, source, dest);
        if (!_.isNil(observationFields)) {
            observationFields.forEach((observationField) => {
                const observations = [];
                if (!_.isNil(source[observationField])) {
                    source[observationField].forEach((observationResource) => {
                        const observation = new Observation();
                        observation.concept = entityService.findByKey('uuid', observationResource["conceptUUID"], Concept.schema.name);
                        const value = observationResource.value;
                        observation.valueJSON = JSON.stringify(observation.concept.getValueWrapperFor(value));
                        observations.push(observation);
                    });
                }
                dest[observationField] = observations;
            });
        }

        return dest;
    }

    static pick(from, attributes, listAttributes) {
        const picked = _.pick(from, attributes);
        if (!_.isNil(listAttributes)) {
            listAttributes.forEach((listAttribute) => {
                picked[listAttribute] = [];
                from[listAttribute].forEach((item) => picked[listAttribute].push(item));
            });
        }
        return picked;
    }

    //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    static randomUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static areEqualShallow(a, b) {
        if (_.isNil(a) !== _.isNil(b))
            return false;

        if (!_.isEmpty(_.xor(_.keys(a),_.keys(b))))
            return false;

        return _.every(_.keys(a), (key)=>{
            return a[key] === b[key];
        });
    }

    static dateWithoutTime(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    static datesAreSame(a, b) {
        return moment(a).isSame(moment(b), 'day');
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

    static logDebug(source, message) {
        General.log(source, message, General.LogLevel.Debug);
    }

    static logInfo(source, message) {
        General.log(source, message, General.LogLevel.Info);
    }

    static logWarn(source, message) {
        General.log(source, message, General.LogLevel.Warn);
    }

    static logError(source, message) {
        General.log(source, message, General.LogLevel.Error);
    }

    static log(source, message, level) {
        try {
            let levelName = `${_.findKey(General.LogLevel, (value) => value === level)}`;
            let logMessage = `[${source}][${levelName}] ${General.getDisplayableMessage(message)}`;
            if (level >= General.getCurrentLogLevel())
                console.log(logMessage);
        } catch (e) {
            console.log('General', `Logger failed for : 'General.log("${source}",....)' with error: "${e.message}"`, level);
        }
    }

    static getDisplayableMessage(obj) {
        if (typeof obj === 'object') {
            let s = JSON.stringify(obj);
            if (s === '{}') return obj;
            return s;
        }
        return obj;
    }

    static isoFormat(date) {
        if (_.isNil(date)) return null;
        return moment(date).format();
    }

    static isNumeric(str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    }

    static weeksBetween(arg1, arg2) {
        return moment.duration(moment(arg1).diff(moment(arg2))).asWeeks();
    }

    static isEmptyOrBlank(value) {
        return _.overSome([_.isNil, _.isNaN])(value) ? true :
            _.overSome([_.isNumber, _.isBoolean, _.isDate])(value) ? false :
                    _.isEmpty(value);
    }

    static dlog(str,...values) {
        console.log(_.pad(str, 40, '-'));
        console.log(...values);
    }
}

export default General;