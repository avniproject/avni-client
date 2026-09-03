import DGS from "./DynamicGlobalStyles";
import {useContext} from "react";
import {Dimensions} from "react-native";
import {Platform, StatusBar} from 'react-native';
import {SafeAreaInsetsContext} from "react-native-safe-area-context";

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

    // Android 16+ (API 36) forces edge-to-edge; the windowOptOutEdgeToEdgeEnforcement opt-out only works on API <= 35, so on 36+ the app must reserve status-bar space itself. Older OSes already inset content.
    static get EdgeToEdgeStatusBarInset() {
        return (Platform.OS === 'android' && Platform.Version >= 36) ? (StatusBar.currentHeight || 0) : 0;
    }

    static ContentDistanceFromEdge = 16;
    static ContainerHorizontalDistanceFromEdge = 14;
    static ContentDistanceWithinContainer = 10;
    static VerticalSpacingBetweenFormElements = 20;
    static VerticalSpacingDisplaySections = 16;
    static VerticalSpacingBetweenOptionItems = DGS.resizeHeight(8);
    static VerticalSmallSpacingBetweenOptionItems = DGS.resizeHeight(2);
    static HorizontalSpacingBetweenOptionItems = 20;
    static HorizontalSmallSpacingBetweenOptionItems = 8;
}

// The navigation-bar half of the same problem: under forced edge-to-edge the activity window also runs
// under the bottom bar, so bottom-anchored content has to reserve that strip. Measured rather than
// assumed, because it differs between gesture and 3-button navigation. Only the activity window needs
// this — a Modal gets its own dialog window, which RN keeps fitted to the system bars unless it is
// given navigationBarTranslucent, so modals must not add the inset again.
// Needs a SafeAreaProvider above it — NativeBaseProvider renders one inside every CHSContainer.
export function useEdgeToEdgeNavBarInset() {
    const insets = useContext(SafeAreaInsetsContext);
    return (Platform.OS === 'android' && Platform.Version >= 36) ? (insets?.bottom ?? 0) : 0;
}

export default Distances;