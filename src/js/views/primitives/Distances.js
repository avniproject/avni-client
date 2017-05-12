import DGS from "./DynamicGlobalStyles";

class Distances {
    static get ScaledContentDistanceFromEdge() {
        return DGS.resizeWidth(Distances.ContentDistanceFromEdge);
    }

    static get ScaledContainerHorizontalDistanceFromEdge() {
        return DGS.resizeWidth(Distances.ContainerHorizontalDistanceFromEdge);
    }

    static ContentDistanceFromEdge = 27;
    static ContainerHorizontalDistanceFromEdge = 24;
    static VerticalSpacingBetweenFormElements = 16;
    static VerticalSpacingDisplaySections = 16;
}

export default Distances;