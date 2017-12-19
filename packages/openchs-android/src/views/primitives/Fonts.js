import {typography} from './MaterialDesign';

class Fonts {
    static Normal = 15;
    static Medium = 15;
    static Large = 17;
    static TitleSize = 17;

    static typography(style) {
        return typography[style]
    };


    static get LargeBold() {
        return {fontSize: Fonts.Large, fontWeight: 'bold'};
    }

    static get MediumBold() {
        return {fontSize: Fonts.Medium, fontWeight: 'bold'};
    }

    static get LargeRegular() {
        return {fontSize: Fonts.Large}
    }

    static get Title() {
        return {fontSize: Fonts.TitleSize, fontWeight: 'bold'}
    }
}

export default Fonts;