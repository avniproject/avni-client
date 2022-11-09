import {Dimensions} from "react-native";
import {expect} from "chai";
import DynamicGlobalStyles from "../../../../src/views/primitives/DynamicGlobalStyles";

describe('DynamicGlobalStylesTest', () => {
    it('numberOfRows', () => {
        Dimensions.get('window').width;
        DynamicGlobalStyles.numberOfRows(10);
    });
});
