import {color} from './MaterialDesign';

class Colors {
    static DarkPrimaryColor = '#00796B'; // for header, footer etc
    static DefaultPrimaryColor = '#212121'; //default button colors, whenever you need a color
    static AccentColor = '#009688'; // for fabs etc
    static TextOnPrimaryColor = '#FFFFFF';


    static Complimentary = '#148be4';
    static TertiaryColor = 'lightgrey';

    static ValidationError = '#d0011b';
    static AbnormalValueHighlight = '#d0011b';
    static NegativeActionButtonColor = '#d0011b';
    static InputNormal = 'rgba(0, 0, 0, 0.87)';
    static InputBorderNormal = 'rgba(0, 0, 0, 0.12)';
    static GreyBackground = 'rgba(97, 97, 97, 0.20)';
    static BlackBackground = '#212121';
    static ActionButtonColor = '#009688';
    static SecondaryActionButtonColor = '#e0e0e0';
    static GreyContentBackground = '#f7f7f7';
    static HighlightBackgroundColor = 'lightgrey';

    static ChecklistItemUpcoming = 'yellow';
    static ChecklistItemUnfulfilled = 'greenyellow';
    static ChecklistItemFulfilled = 'green';
    static ChecklistItemExpired = 'red';

    static FilterBar = '#114486';

    static getCode(colorName) {
        return color[colorName];
    }

    static headerIconColor = '#FFFFFF';
    static headerTextColor = '#FFFFFF';
    static headerBackgroundColor = '#212121';
    static bottomBarColor = "white";
    static bottomBarIconColor = 'black';

    static iconSelectedColor = '#126CB4';
    static cardBackgroundColor = '#fefefe';

    static OverdueVisitColor = '#d0011b';
    static FutureVisitColor = 'gold';
    static ScheduledVisitColor = '#009688';
    static VisitActionColor = '#9013fe';
    static CancelledVisitColor = '#f5a623'
}

export default Colors;
