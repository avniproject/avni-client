import Distances from "./Distances";
import Colors from "./Colors";

class Styles {
}


Styles.accentColor = '#009688';
Styles.whiteColor = '#ffffff';
Styles.blackColor = '#000000';
Styles.redColor = '#ff0000';
Styles.defaultBackground = '#212121';
Styles.groupSubjectBackground = '#871f74';
Styles.greyBackground = '#f7f7f7';
Styles.greyText = '#666666';
Styles.blueColor='#0000e5';

Styles.titleSize = 20;
Styles.normalTextSize = 16;
Styles.smallTextSize = 14;
Styles.smallerTextSize = 12;

const computeLineHeight = (fontSize) => fontSize * 2;
Styles.titleSizeLineHeight = computeLineHeight(Styles.titleSize) ;
Styles.normalTextSizeLineHeight = computeLineHeight(Styles.normalTextSize);
Styles.smallTextSizeLineHeight = computeLineHeight(Styles.smallTextSize);
Styles.smallerTextSizeLineHeight = computeLineHeight(Styles.smallTextSize);

Styles.ContentDistanceFromEdge = 24;
Styles.ContainerHorizontalDistanceFromEdge = 14;
Styles.ContentDistanceWithinContainer = 10;
Styles.VerticalSpacingBetweenFormElements = 20;
Styles.VerticalSpacingBetweenInGroupFormElements = 4;
Styles.VerticalSpacingDisplaySections = 16;
Styles.VerticalSpacingBetweenOptionItems = 20;

Styles.programProfileHeading = {
    fontSize: Styles.normalTextSize,
    color: Styles.whiteColor,
    lineHeight: Styles.normalTextSizeLineHeight
};

Styles.container = {
    paddingHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
};

Styles.programProfileSubheading = {
    fontSize: Styles.smallTextSize,
    color: Styles.whiteColor,
    lineHeight: Styles.smallTextSizeLineHeight
};

Styles.navbarHelpText = {
    fontSize: 36,
    fontStyle: 'normal',
    color: '#9e9e9e',
    lineHeight: 50,
};

Styles.navBarTitleInactive = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.whiteColor,
    lineHeight: Styles.titleSizeLineHeight,
};

Styles.navbarTitleSelected = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.whiteColor,
    lineHeight: Styles.titleSizeLineHeight,
};

Styles.dialogTitle = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.titleSizeLineHeight,
};

Styles.settingsTitle = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.titleSizeLineHeight,
    marginVertical: 16
};

Styles.menuTitle = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.titleSizeLineHeight,
    alignSelf: 'center',
};

Styles.timerStyle = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    fontWeight: 'bold',
    lineHeight: Styles.titleSizeLineHeight,
    alignSelf: 'center',
};

Styles.textStyle = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.normalTextSizeLineHeight
};

Styles.dialogMessage = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.normalTextSizeLineHeight
};

Styles.textStyle2 = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.normalTextSizeLineHeight
};

Styles.formBodyText = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
};

Styles.simpleTextFormElement = {
    paddingTop: 0,
    marginBottom: 20
};

Styles.tableColumnContent = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.accentColor
};

Styles.programProfileBodySubtext = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: '#4a4a4a',
    lineHeight: Styles.normalTextSizeLineHeight
};

Styles.formInputHelpText = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: '#151515',
};

Styles.buttonFlatActive = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: '#212121',
    alignSelf: 'center',
};

Styles.buttonSecondaryInactive = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    alignSelf: 'center',
};

Styles.buttonPrimaryTextActive = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    fontWeight: 'bold',
    color: Styles.whiteColor,
    alignSelf: 'center',
};

Styles.programProfileButtonText = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: Styles.accentColor,
    alignSelf: 'center',
};

Styles.logoPlaceHolder = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    fontWeight: 'bold',
    color: Styles.blackColor,
    alignSelf: 'center',
    paddingBottom: Styles.titleSize,
};

Styles.programProfileProgramTitleUnselected2 = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: '#4a90e2',
};

Styles.programProfileProgramTitleSelected = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: Styles.whiteColor,
};

Styles.programProfileSubtext = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: Styles.whiteColor,
};

Styles.patientProfileBodySubtext2 = {
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    color: '##4a4a4a',
    lineHeight: Styles.smallTextSizeLineHeight,
};

Styles.userProfileProgramTitle = {
    fontSize: Styles.smallerTextSize,
    fontStyle: 'normal',
    color: Styles.whiteColor,
};

Styles.expandCollapse = {
    fontSize: Styles.smallerTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.smallerTextSizeLineHeight,
};

Styles.userProfileSubtext = {
    fontSize: Styles.smallerTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    paddingRight: 8
};

Styles.relativeRelationText = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    paddingRight: 8
};

Styles.formLabel = {
    fontSize: Styles.normalTextSize,
    fontStyle: 'normal',
    color: Styles.greyText,
    lineHeight: Styles.normalTextSizeLineHeight,
};

Styles.helpText = {
    fontSize: 13,
    fontStyle: 'normal',
    color: '#8e8e8e',
    lineHeight: 16,
};

Styles.formGroupLabel = {
    fontSize: Styles.titleSize,
    fontStyle: 'normal',
    color: Styles.blackColor,
    lineHeight: Styles.titleSizeLineHeight
};

Styles.basicPrimaryButtonView = {
    minHeight: 36,
    marginBottom: 8,
    elevation: 2,
    borderRadius: 4,
    flexWrap: 'wrap',
    backgroundColor: Styles.accentColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
};

Styles.basicSecondaryButtonView = {
    minHeight: 36,
    marginBottom: 8,
    elevation: 2,
    borderRadius: 4,
    flexWrap: 'wrap',
    backgroundColor: '#e0e0e0', //Colors.SecondaryActionButtonColor
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
};

Styles.listContainer= {
    borderWidth: 1,
    borderRadius: 1,
    borderStyle: 'dashed',
    borderColor: Colors.InputBorderNormal,
    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
    paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
    marginTop:Styles.VerticalSpacingDisplaySections,
    marginBottom: Styles.VerticalSpacingDisplaySections
}

Styles.textList = {
    flex:1,
    fontSize: Styles.smallTextSize,
    fontStyle: 'normal',
    fontWeight: 'normal',
    color: Styles.greyText,
    lineHeight: Styles.smallTextSizeLineHeight,
    marginVertical: 8
}

Styles.cardTitle = {
    fontSize: 17,
    fontStyle: 'normal',
    color: Styles.blackColor,
    letterSpacing: 0.1
};

export default Styles;
