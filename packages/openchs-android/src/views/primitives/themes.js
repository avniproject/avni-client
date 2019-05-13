import Color from 'color';
import Colors from "./Colors";

import {Platform} from 'react-native';

export default {

    // Badge
    badgeBg: '#ED1727',
    badgeColor: '#fff',


    // Button
    btnFontFamily: (Platform.OS === 'ios' ) ? 'HelveticaNeue' : 'Roboto_medium',
    btnDisabledBg: '#b5b5b5',
    btnDisabledClr: '#f1f1f1',

    get btnPrimaryBg() {
        return this.brandPrimary;
    },
    get btnPrimaryColor() {
        return this.inverseTextColor;
    },
    get btnInfoBg() {
        return this.brandInfo;
    },
    get btnInfoColor() {
        return this.inverseTextColor;
    },
    get btnSuccessBg() {
        return this.brandSuccess;
    },
    get btnSuccessColor() {
        return this.inverseTextColor;
    },
    get btnDangerBg() {
        return this.brandDanger;
    },
    get btnDangerColor() {
        return this.inverseTextColor;
    },
    get btnWarningBg() {
        return this.brandWarning;
    },
    get btnWarningColor() {
        return this.inverseTextColor;
    },
    get btnTextSize() {
        return (Platform.OS === 'ios') ? this.fontSizeBase * 1.5 : 14;
    },
    get btnTextSizeLarge() {
        return this.fontSizeBase * 2;
    },
    get btnTextSizeSmall() {
        return this.fontSizeBase * .8;
    },
    get borderRadiusLarge() {
        return this.fontSizeBase * 3.8;
    },

    buttonPadding: 6,

    get iconSizeLarge() {
        return this.iconFontSize * 1.5;
    },
    get iconSizeSmall() {
        return this.iconFontSize * .6;
    },


    // Card
    cardDefaultBg: '#fff',


    // Check Box
    checkboxBgColor: Colors.AccentColor,
    checkboxSize: 16,
    checkboxTickColor: '#fff',


    // Color
    brandPrimary: Colors.AccentColor,
    brandInfo: '#5bc0de',
    brandSuccess: '#5cb85c',
    brandDanger: '#d9534f',
    brandWarning: '#f0ad4e',
    brandSidebar: '#252932',


    // Font
    fontFamily: (Platform.OS === 'ios' ) ? 'HelveticaNeue' : 'Roboto',
    fontSizeBase: 15,

    get fontSizeH1() {
        return this.fontSizeBase * 1.8;
    },
    get fontSizeH2() {
        return this.fontSizeBase * 1.6;
    },
    get fontSizeH3() {
        return this.fontSizeBase * 1.2;
    },


    // Footer
    footerHeight: 55,
    footerDefaultBg: (Platform.OS === 'ios' ) ? '#F8F8F8' : '#4179F7',


    //FooterTab
    tabBarTextColor: (Platform.OS === 'ios' ) ? '#6b6b6b' : '#b3c7f9',
    tabBarActiveTextColor: (Platform.OS === 'ios' ) ? '#007aff' : '#fff',
    tabActiveBgColor: (Platform.OS == 'ios') ? '#cde1f9' : undefined,

    //Tab
    tabDefaultBg: (Platform.OS === 'ios' ) ? '#F8F8F8' : Colors.DefaultPrimaryColor,
    topTabBarTextColor: (Platform.OS === 'ios' ) ? '#6b6b6b' : Colors.TextOnPrimaryColor,
    topTabBarActiveTextColor: (Platform.OS === 'ios' ) ? '#007aff' : Colors.TextOnPrimaryColor,
    topTabActiveBgColor: (Platform.OS == 'ios') ? '#cde1f9' : undefined,
    topTabBarBorderColor: (Platform.OS === 'ios' ) ? '#007aff' : '#fff',


    // Header
    iosToolbarBtnColor: '#007aff',
    toolbarDefaultBg: (Platform.OS === 'ios' ) ? '#F8F8F8' : '#4179F7',
    toolbarHeight: (Platform.OS === 'ios' ) ? 64 : 56,
    toolbarIconSize: (Platform.OS === 'ios' ) ? 20 : 22,
    toolbarInputColor: '#CECDD2',
    toolbarInverseBg: '#222',
    toolbarTextColor: (Platform.OS === 'ios') ? '#000' : '#fff',
    get statusBarColor() {
        return Color(this.toolbarDefaultBg).darken(0.2).hex();
    },


    // Icon
    iconFamily: 'MaterialIcons',
    iconFontSize: (Platform.OS === 'ios' ) ? 30 : 28,
    iconMargin: 7,


    // InputGroup
    inputFontSize: 16,
    inputBorderColor: '#D9D5DC',
    inputSuccessBorderColor: '#2b8339',
    inputErrorBorderColor: '#ed2f2f',

    get inputColor() {
        return this.textColor;
    },
    get inputColorPlaceholder() {
        return '#575757';
    },

    inputGroupMarginBottom: 7.5,
    inputHeightBase: 40,
    inputPaddingLeft: 5,

    get inputPaddingLeftIcon() {
        return this.inputPaddingLeft * 8;
    },


    // Line Height
    btnLineHeight: 19,
    lineHeightH1: 32,
    lineHeightH2: 27,
    lineHeightH3: 22,
    iconLineHeight: (Platform.OS === 'ios' ) ? 37 : 30,
    lineHeight: (Platform.OS === 'ios' ) ? 20 : 24,


    // List
    listBorderColor: 'rgba(97, 97, 97, 0.20)',
    listDividerBg: 'rgba(97, 97, 97, 0.20)',
    listItemHeight: 72,
    listItemPadding: 0,
    listNoteColor: '#4a4a4a',
    listNoteSize: 14,


    // Progress Bar
    defaultProgressColor: '#E4202D',
    inverseProgressColor: '#1A191B',


    // Radio Button
    radioBtnSize: (Platform.OS === 'ios') ? 25 : 25,
    radioColor: '#009688',

    get radioSelectedColor() {
        return Color(this.radioColor).darken(0.2).hex();
    },

    radioSelectedColorAndroid: Color("#009688").darken(0.2).hex(),


    // Spinner
    defaultSpinnerColor: '#45D56E',
    inverseSpinnerColor: '#1A191B',


    // Tabs
    tabBgColor: Colors.DefaultPrimaryColor,
    tabFontSize: 20,
    tabTextColor: Colors.TextOnPrimaryColor,


    // Text
    textColor: 'rgba(0, 0, 0, 0.87)',
    inverseTextColor: '#fff',


    // Title
    titleFontSize: (Platform.OS === 'ios' ) ? 17 : 16,
    subTitleFontSize: (Platform.OS === 'ios' ) ? 12 : 14,
    subtitleColor: '#8e8e93',


    // Other
    borderRadiusBase: (Platform.OS === 'ios' ) ? 5 : 2,
    borderWidth: 1,
    contentPadding: 10,

    get darkenHeader() {
        return Color(this.tabBgColor).darken(0.03).hex();
    },

    dropdownBg: '#000',
    dropdownLinkColor: '#414142',
    inputLineHeight: 24,
    jumbotronBg: '#C9C9CE',
    jumbotronPadding: 30
}
