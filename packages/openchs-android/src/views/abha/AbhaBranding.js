// How a build dresses Eka's ABHA screens, from android/app/src/<flavour>/assets/abha_branding.json.
// A build without that file shows Eka's screens as Eka ships them. Every value here is written into the page, so
// only what can be checked as harmless is kept; anything else is left out with a fixed warning.

import _ from 'lodash';
import fs from 'react-native-fs';
import General from '../../utility/General';

export const ABHA_BRANDING_FILE = 'abha_branding.json';

const LOG = 'AbhaBranding';
const COLOUR = /^#[0-9A-Fa-f]{6}$/;
const FONT_FAMILY = /^[A-Za-z0-9 ,'-]{1,80}$/;
const IMAGE_SRC_PART = /^[A-Za-z0-9_-]{3,60}$/;
const LOGO_FILE = /^[A-Za-z0-9_-]{1,60}\.png$/;
const MAX_REPLACEMENT_LENGTH = 200;
// The groups of Eka's TAbhaTheme.
const THEME_GROUPS = ['primary', 'surface', 'content', 'semantic', 'qrCodeColors'];

let reading = null;
let current = null;

class AbhaBranding {
    // Reads the build's file once, and never rejects: null when the build ships none or it cannot be read.
    static load() {
        if (!reading) reading = AbhaBranding.read().then((branding) => current = branding);
        return reading;
    }

    // What load found, or null before it has finished.
    static current() {
        return current;
    }

    static reset() {
        reading = null;
        current = null;
    }

    static async read() {
        let config;
        try {
            if (!_.isFunction(fs.existsAssets) || !(await fs.existsAssets(ABHA_BRANDING_FILE))) return null;
            config = JSON.parse(await fs.readFileAssets(ABHA_BRANDING_FILE, 'utf8'));
        } catch (e) {
            General.logWarn(LOG, 'ABHA screens shown without the build\'s branding: its file could not be read');
            return null;
        }
        if (!_.isPlainObject(config)) {
            General.logWarn(LOG, 'ABHA screens shown without the build\'s branding: its file is not an object');
            return null;
        }
        return {...AbhaBranding.fromConfig(config), logoUrl: await AbhaBranding.logoOf(config.orgIcon)};
    }

    // The logo as a data URI: the page loads nothing from the phone's files.
    static async logoOf(file) {
        if (_.isNil(file)) return null;
        if (!_.isString(file) || !LOGO_FILE.test(file)) {
            General.logWarn(LOG, 'ABHA logo left out: orgIcon is not a .png file name');
            return null;
        }
        try {
            return `data:image/png;base64,${await fs.readFileAssets(file, 'base64')}`;
        } catch (e) {
            General.logWarn(LOG, 'ABHA logo left out: its file could not be read');
            return null;
        }
    }

    static fromConfig(config) {
        const theme = AbhaBranding.themeOf(config.theme);
        return {
            theme,
            brandColour: _.get(theme, 'primary.brand', null),
            fontFamily: AbhaBranding.fontFamilyOf(config.fontFamily),
            textReplacements: AbhaBranding.textReplacementsOf(config.textReplacements),
            imageTopCrops: AbhaBranding.imageTopCropsOf(config.imageTopCrops),
            logoInPlaceOfAbdm: AbhaBranding.logoInPlaceOfAbdmOf(config.logoInPlaceOfAbdm),
        };
    }

    // True puts the build's logo where Eka's first screen shows the ABDM logo; otherwise it sits beside it.
    static logoInPlaceOfAbdmOf(value) {
        if (_.isNil(value)) return false;
        if (_.isBoolean(value)) return value;
        General.logWarn(LOG, 'ABHA logo placement left as Eka has it: logoInPlaceOfAbdm is not true or false');
        return false;
    }

    static themeOf(theme) {
        let dropped = false;
        const kept = {};
        THEME_GROUPS.forEach((group) => {
            const colours = _.get(theme, group);
            if (_.isNil(colours)) return;
            const valid = _.pickBy(colours, (value) => _.isString(value) && COLOUR.test(value));
            if (!_.isPlainObject(colours) || _.size(valid) !== _.size(colours)) dropped = true;
            if (!_.isEmpty(valid)) kept[group] = valid;
        });
        if (dropped) General.logWarn(LOG, 'ABHA theme: a colour that is not #RRGGBB was left out');
        return kept;
    }

    static fontFamilyOf(fontFamily) {
        if (_.isNil(fontFamily)) return null;
        if (_.isString(fontFamily) && FONT_FAMILY.test(fontFamily)) return fontFamily;
        General.logWarn(LOG, 'ABHA font left out: it has characters a font name does not need');
        return null;
    }

    // A replacement whose text would match its own pattern again is left out: the page would rewrite it forever.
    static textReplacementsOf(replacements) {
        if (_.isNil(replacements)) return [];
        const kept = _.filter(_.isArray(replacements) ? replacements : [], ({find, replace} = {}) => {
            if (!_.isString(find) || _.isEmpty(find) || !_.isString(replace) || replace.length > MAX_REPLACEMENT_LENGTH) return false;
            try {
                return !new RegExp(find).test(replace);
            } catch (e) {
                return false;
            }
        }).map(({find, replace}) => ({find, replace}));
        if (!_.isArray(replacements) || kept.length !== replacements.length) General.logWarn(LOG, 'ABHA wording: a replacement that cannot be used was left out');
        return kept;
    }

    // {part of an image's address: the percentage of its height to cut from the top}.
    static imageTopCropsOf(crops) {
        if (_.isNil(crops)) return {};
        const kept = _.pickBy(_.isPlainObject(crops) ? crops : {}, (percent, srcPart) =>
            IMAGE_SRC_PART.test(srcPart) && _.isInteger(percent) && percent >= 1 && percent <= 40);
        if (!_.isPlainObject(crops) || _.size(kept) !== _.size(crops)) General.logWarn(LOG, 'ABHA image crop: an entry that cannot be used was left out');
        return kept;
    }
}

export default AbhaBranding;
