import _ from "lodash";
import {Dimensions} from "react-native";

class DynamicGlobalStyles {
    constructor() {
        this.windowWidth = Dimensions.get('window').width;
        this.windowHeight = Dimensions.get('window').height;
        // @formatter:off
        this.mainContent = {marginHorizontal: this.resize(24)};
            this.formTextElement = {marginLeft: 0, height: this.resizeHeight(76)};
                this.formElementLabel = {fontSize: this.resize(12), height: this.resizeHeight(38), textAlignVertical: 'center'};
                this.formElementTextInput = {flex: 1, height: this.resizeHeight(44)};
            this.formCheckboxElement = {marginLeft: 0, marginTop: this.resizeHeight(16)};
        // @formatter:on
    }

    addFontSize(style, size) {
        style.fontSize = this.resize(size);
        return style;
    };

    resize(size) {
        return size * this.windowWidth / 600;
        // return size;
    }

    resizeHeight(size) {
        return size * this.windowHeight / 960;
    }

    resizeTextInputHeight(size) {
        const resizedHeight = this.resizeHeight(size);
        return resizedHeight < 26 ? 26 : resizedHeight;
    }
}

export default new DynamicGlobalStyles();