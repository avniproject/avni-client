import {Dimensions, PixelRatio} from 'react-native';

class Styler {
    static getScaledFont(size) {
        const dimension = Dimensions.get('window');
        console.log(dimension);
        return size;
        // return PixelRatio.getPixelSizeForLayoutSize();
        // return (size * 2.4)/dimension.fontScale;
    }
}

export default Styler;