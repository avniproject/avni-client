import DGS from "./DynamicGlobalStyles";
import {useContext} from "react";
import {Dimensions} from "react-native";
import {Platform, StatusBar} from 'react-native';
import {SafeAreaInsetsContext} from "react-native-safe-area-context";

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

    // LandingView's absolute bottom tab bar (Home/Register/More) sits on top of whatever screen renders
    // behind it - its height is LandingView.layoutConstants.bottomBarHeight (80, duplicated here rather than
    // imported to avoid a circular import: LandingView imports the dashboard screens that need this value).
    // Screens whose scrollable content can render behind it (the home dashboard tabs) reserve this much
    // bottom padding so their last row isn't hidden under it. The Android 16+ edge-to-edge nav-bar inset
    // is NOT included: CHSContainer reserves that once per screen, below the bar.
    static get BottomTabBarClearance() {
        return 80;
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

// Android 16+ (API 36) forces edge-to-edge; the windowOptOutEdgeToEdgeEnforcement opt-out only works on
// API <= 35, so on 36+ the app must reserve the system bars' space itself. Older OSes already inset
// content, hence the version gate on both of these.

// The measured top inset covers the status bar and the display cutout, so it is right on a device whose
// cutout is taller than its status bar — and, unlike the status-bar height, it is a live window value:
// it goes to 0 when the bar is hidden or the app is the lower half of a split screen, where a resource
// height would leave a phantom gap. Falls back to that height for any header rendered without a
// provider above it.
export function edgeToEdgeStatusBarInset(insets) {
    if (Platform.OS !== 'android' || Platform.Version < 36) return 0;
    return insets?.top ?? (StatusBar.currentHeight || 0);
}

// The navigation-bar half of the same problem: the window also runs under the bottom bar, so
// bottom-anchored content has to reserve that strip. Measured rather than assumed, because it differs
// between gesture and 3-button navigation. Only the activity window needs this — a Modal gets its own
// dialog window, which RN keeps fitted to the system bars unless given navigationBarTranslucent, so
// modals must not add the inset again.
export function edgeToEdgeNavBarInset(insets) {
    return (Platform.OS === 'android' && Platform.Version >= 36) ? (insets?.bottom ?? 0) : 0;
}

// Needs a SafeAreaProvider above it — NativeBaseProvider renders one inside every CHSContainer.
// Class components read the same values through SafeAreaInsetsContext.Consumer.
export function useEdgeToEdgeNavBarInset() {
    return edgeToEdgeNavBarInset(useContext(SafeAreaInsetsContext));
}

export default Distances;