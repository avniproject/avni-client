class Fonts {
    static Normal = 12;
    static Medium = 14;
    static Large = 16;
    static TitleSize = 24;

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