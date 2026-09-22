import DGS from "./DynamicGlobalStyles";
import {Dimensions} from "react-native";
import {Platform, StatusBar} from 'react-native';
import {initialWindowMetrics} from 'react-native-safe-area-context';

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

    // Android 16+ (API 36) forces edge-to-edge; the windowOptOutEdgeToEdgeEnforcement opt-out only works on API <= 35, so on 36+ the app must reserve status-bar space itself. Older OSes already inset content.
    static get EdgeToEdgeStatusBarInset() {
        return (Platform.OS === 'android' && Platform.Version >= 36) ? (StatusBar.currentHeight || 0) : 0;
    }

    // Same Android 16+ (API 36) edge-to-edge enforcement, but for the bottom/gesture nav bar.
    // StatusBar.currentHeight has no bottom-inset counterpart, so this reads react-native-safe-area-context's
    // initialWindowMetrics — a plain native constant populated before JS runs, same "just read a constant,
    // no provider/hook needed" shape as EdgeToEdgeStatusBarInset above.
    static get EdgeToEdgeNavigationBarInset() {
        return (Platform.OS === 'android' && Platform.Version >= 36) ? (initialWindowMetrics?.insets?.bottom || 0) : 0;
    }

    // LandingView's absolute bottom tab bar (Home/Register/More) sits on top of whatever screen renders
    // behind it - its height is LandingView.layoutConstants.bottomBarHeight (80, duplicated here rather than
    // imported to avoid a circular import: LandingView imports the dashboard screens that need this value)
    // plus the same edge-to-edge inset added to that bar. Screens whose scrollable content can render behind
    // it (the home dashboard tabs) reserve this much bottom padding so their last row isn't hidden under it.
    static get BottomTabBarClearance() {
        return 80 + Distances.EdgeToEdgeNavigationBarInset;
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