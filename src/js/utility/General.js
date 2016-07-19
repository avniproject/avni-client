import I18n from '../utility/Messages';

class General {
    static formatDateTime(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }


    static isDefined(value) {
        return value != undefined || value != null;
    }

    static getCurrentDate() {
        const date = new Date();
        return General.formatDate(date);
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

    static isAnswerNotWithinRange(answer, question) {
        return !isNaN(answer) && (answer < question.lowAbsolute || answer > question.hiAbsolute);
    }

    static formatRange(question) {
        return `[${question.lowAbsolute} - ${question.hiAbsolute}]`;
    }
}

export default General;