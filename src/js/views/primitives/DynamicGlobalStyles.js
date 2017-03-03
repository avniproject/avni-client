import {Dimensions} from "react-native";
import Colors from '../primitives/Colors';
import Fonts from '../primitives/Fonts';

class DynamicGlobalStyles {
    constructor() {
        this.windowWidth = Dimensions.get('window').width;
        this.windowHeight = Dimensions.get('window').height;
        // @formatter:off
        this.mainContent = {marginHorizontal: this.resizeWidth(24)};
            this.formRow = {marginTop: this.resizeHeight(16)};
                this.formTextElement = {marginLeft: 0};
                    this.formElementLabel = {fontSize: Fonts.Normal, textAlignVertical: 'center', color: 'rgba(15, 15, 15, 0.75)'};
                    this.formElementTextInput = {flex: 1, fontSize: 16};
                this.formCheckboxElement = {marginLeft: 0, marginTop: this.resizeHeight(16)};
                this.formRadioText = {fontSize: 16, marginLeft: this.resizeWidth(10)};
        // @formatter:on
        this.createCommonStyles();
        this.createObservationsStyles();
        this.createGeneralHistoryStyles();
        this.createCardStyles();
    }

    createObservationsStyles() {
        this.observations = {
            observationRowHeader: {height: this.resizeHeight(44), borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
            observationRow: {borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
            observationTable: {marginTop: this.resizeHeight(16)},
            observationColumn: {borderLeftWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
            component: {backgroundColor: '#f7f7f7', marginBottom: this.resizeHeight(36)}
        }
    }

    resizeWidth(size) {
        return size * this.windowWidth / 600;
    }

    resizeHeight(size) {
        return size * this.windowHeight / 960;
    }

    resizeTextInputHeight(size) {
        const resizedHeight = this.resizeHeight(size);
        return resizedHeight < 26 ? 26 : resizedHeight;
    }

    numberOfTableColumns() {
        return this.windowWidth / 110;
    }

    numberOfRows(numberOfCells) {
        return numberOfCells % this.numberOfTableColumns() + 1;
    }

    createCommonStyles() {
        this.common = {
            content: {marginHorizontal: this.resizeWidth(24), marginTop: this.resizeHeight(16)}
        }
    }

    createGeneralHistoryStyles() {
        this.generalHistory = {
            encounter: {backgroundColor: '#f7f7f7', marginTop: this.resizeHeight(16)},
            encounterDateGrid: {marginBottom: this.resizeHeight(8)},
            buttonStyle: {marginLeft: 8, height: this.resizeHeight(26), justifyContent: 'center'},
            buttonRowStyle: {justifyContent: 'center', height: this.resizeHeight(40)}
        };
    }

    createCardStyles() {
        this.card = {
            self: {marginTop: this.resizeHeight(8), paddingHorizontal: this.resizeWidth(12), paddingVertical: this.resizeHeight(18)},
            title: {fontSize: 20, color: Colors.InputNormal, marginTop: this.resizeHeight(4)},
            separator: {marginTop: this.resizeHeight(24)},
            aggregate: {
                self: {marginLeft: this.resizeWidth(3.2), marginTop: this.resizeHeight(24)},
                label: {fontSize: Fonts.Normal, color: Colors.InputNormal},
                value: {fontSize: 32, color: Colors.InputNormal}
            },
            action: {
                self: {marginTop: this.resizeHeight(20), flexDirection: 'row', justifyContent: 'flex-end'},
                button: {fontSize: 14}
            },
            table: {
                title: {fontSize: 16, color: Colors.InputNormal, marginTop: this.resizeHeight(18)}
            }
        }
    }
}

export default new DynamicGlobalStyles();