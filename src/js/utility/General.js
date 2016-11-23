import Duration from "../models/Duration";
import _ from 'lodash';
import moment from "moment";
import ResourceUtil from "./ResourceUtil";

class General {
    static formatDateTime(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }

    static isDefined(value) {
        return value != undefined || value != null;
    }

    static isNilOrEmpty(value) {
        return _.isNil(value) || _.isEmpty(_.trim(value));
    }

    static emptyFunction() {

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

    static formatDate(date) {
        return `${General.toTwoChars(date.getDate())}-${General.toTwoChars(date.getMonth() + 1)}-${date.getFullYear()}`;
    }

    static isoFormat(date) {
        return `${date.getFullYear()}-${General.toTwoChars(date.getMonth() + 1)}-${General.toTwoChars(date.getDate())}`;
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

    static toExportable(str) {
        var result = str.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0)
            result = '"' + result + '"';
        return result;
    }

    static replaceAndroidIncompatibleChars(str) {
        const illegalCharacters = "|\\?*<\":>+[]/'";
        const array = illegalCharacters.split('');
        array.forEach(function (character) {
            str = str.replace(character, '_');
        });
        return str;
    }

    static formatRange(question) {
        return `[${question.lowAbsolute} - ${question.hiAbsolute}]`;
    }

    static assignFields(source, dest, directCopyFields, dateFields, referenceUUIDFields) {
        if (!_.isNil(directCopyFields)) {
            directCopyFields.forEach((fieldName) => {
                dest[fieldName] = source[fieldName];
            });
        }
        if (!_.isNil(dateFields)) {
            dateFields.forEach((fieldName) => {
                dest[fieldName] = new Date(source[fieldName]);
            });
        }
        if (!_.isNil(referenceUUIDFields)) {
            referenceUUIDFields.forEach((fieldName) => {
                dest[fieldName] = ResourceUtil.getUUIDFor(source, fieldName);
            });
        }

        return dest;
    }
}

export default General;