import DGS from "./DynamicGlobalStyles";
import {Dimensions} from "react-native";
import {StatusBar} from 'react-native';

class Distances {
    static get ScaledContentDistanceFromEdge() {
        return DGS.resizeWidth(Distances.ContentDistanceFromEdge);
    }

    static get ScaledContainerHorizontalDistanceFromEdge() {
        return DGS.resizeWidth(Distances.ContainerHorizontalDistanceFromEdge);
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
    static ContainerHorizontalDistanceFromEdge = 14;
    static ContentDistanceWithinContainer = 10;
    static VerticalSpacingBetweenFormElements = 20;
    static VerticalSpacingDisplaySections = 16;
    static VerticalSpacingBetweenOptionItems = DGS.resizeHeight(8);
    static HorizontalSpacingBetweenOptionItems = 20;
}

export default Distances;