import DGS from "./DynamicGlobalStyles";
import {Dimensions} from "react-native";
import {StatusBar} from 'react-native';

class Distances {
    // Fixed rather than scaled off DGS.resizeWidth(windowWidth) - that scaling is proportional to
    // each device's own reported width, so the same code rendered visibly different edge margins
    // across devices (e.g. looked right on a Pixel emulator, off on a OnePlus Nord). A flat value
    // matching the dashboard's own edge margin (SubjectDashboardGeneralTab's marginHorizontal: 10)
    // keeps this consistent across devices and across screens.
    static get ScaledContentDistanceFromEdge() {
        return 15;
    }

    // Same fixed-not-scaled reasoning as ScaledContentDistanceFromEdge above - this is the
    // constant that actually controls the edge margin of form question/answer content
    // (FormElementGroup), separate from the outer page wrapper.
    static get ScaledContainerHorizontalDistanceFromEdge() {
        return 15;
    }

    static get ScaledVerticalSpacingBetweenOptionItems() {
        return DGS.resizeHeight(Distances.VerticalSpacingBetweenOptionItems);
    }

    static get ScaledVerticalSpacingDisplaySections() {
        return DGS.resizeHeight(Distances.VerticalSpacingDisplaySections);
    }

    static get ScaledVerticalSpacingBetweenFormElements() {
        return DGS.resizeHeight(Distances.VerticalSpacingBetweenFormElements);
    }

    static get ScaledContentDistanceWithinContainer() {
        return DGS.resizeWidth(Distances.ContentDistanceWithinContainer);
    }

    static get DeviceWidth() {
        return Dimensions.get('window').width;
    }

    static get DeviceHeight() {
        return Dimensions.get('window').height;
    }

    static get DeviceEffectiveHeight() {
        return Dimensions.get('window').height - StatusBar.currentHeight;
    }

    static ContentDistanceFromEdge = 16;
    static ContainerHorizontalDistanceFromEdge = 16;
    static ContentDistanceWithinContainer = 10;
    static VerticalSpacingBetweenFormElements = 20;
    static VerticalSpacingDisplaySections = 16;
    static VerticalSpacingBetweenOptionItems = DGS.resizeHeight(8);
    static VerticalSmallSpacingBetweenOptionItems = DGS.resizeHeight(2);
    static HorizontalSpacingBetweenOptionItems = 20;
    static HorizontalSmallSpacingBetweenOptionItems = 8;
}

export default Distances;