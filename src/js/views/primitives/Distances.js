import DGS from "./DynamicGlobalStyles";

class Distances {
    static get ScaledContentDistanceFromEdge() {
        return DGS.resizeWidth(Distances.ContentDistanceFromEdge);
    }

    static ContentDistanceFromEdge = 24;
    static VerticalSpacingBetweenFormElements = 16;
}

export default Distances;