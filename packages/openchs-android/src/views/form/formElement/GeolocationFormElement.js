import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Styles from "../../primitives/Styles";
import {PermissionsAndroid, Platform, Text, View} from "react-native";
import Geolocation from "react-native-geolocation-service";
import Colors from "../../primitives/Colors";
import ValidationErrorMessage from "../ValidationErrorMessage";
import General from "../../../utility/General";
import Distances from "../../primitives/Distances";
import {Button, Icon} from "native-base";
import Geo from "../../../framework/geo";
import SettingsService from "../../../service/SettingsService";

class GeolocationFormElement extends AbstractComponent {
    static propTypes = {
        actionName: React.PropTypes.string.isRequired,
        errorActionName: React.PropTypes.string.isRequired,
        location: React.PropTypes.object,
        editing: React.PropTypes.bool.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.getPosition = this.getPosition.bind(this);
        this.settings = context.getService(SettingsService).getSettings();
    }

    componentDidMount() {
        if (!this.props.editing && this.settings.captureLocation) {
            this.getPosition();
        }
    }

    async askLocationPermission() {
        if (Platform.OS === "ios" || (Platform.OS === "android" && Platform.Version < 23)) {
            return true;
        }

        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (hasPermission) return true;

        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (status === PermissionsAndroid.RESULTS.GRANTED) return true;

        if (status === PermissionsAndroid.RESULTS.DENIED) {
            this.dispatchAction(this.props.errorActionName, {value: {code: Geo.ErrorCodes.PERMISSION_DENIED}});
            General.logDebug("Geo", "Location permission denied by user");
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            this.dispatchAction(this.props.errorActionName, {value: {code: Geo.ErrorCodes.PERMISSION_NEVER_ASK_AGAIN}});
            General.logDebug("Geo", "Location permission revoked by user");
        }

        return false;
    }

    async getPosition() {
        const hasPermission = await this.askLocationPermission();
        console.log(`has permission ${hasPermission}`);
        if (hasPermission) {
            console.log("requesting position");
            Geolocation.getCurrentPosition(
                position => {
                    this.dispatchAction(this.props.actionName, {value: position});
                },
                error => {
                    this.dispatchAction(this.props.errorActionName, {value: error});
                    General.logError("GeolocationFormElement", error);
                },
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
            );
        }
    }

    renderCoordinates() {
        const location = this.props.location;
        return (
            <Text
                style={[
                    {
                        flex: 1,
                        marginVertical: 0,
                        paddingVertical: 5
                    },
                    Styles.formBodyText,
                    {color: Colors.InputNormal}
                ]}
            >
                {location != null ? `${location.x} , ${location.y}` : ""}
            </Text>
        );
    }

    renderGetLocationButton() {
        return (
            <Button small primary iconLeft onPress={this.getPosition}>
                <Icon name="my-location" />
                <Text>{this.I18n.t("getLocation")}</Text>
            </Button>
        );
    }

    render() {
        General.logDebug("GeolocationFormElement", `render, props: editing ${this.props.editing}`);
        return this.settings.captureLocation ? (
            <View
                style={this.appendedStyle({
                    paddingTop: Distances.VerticalSpacingBetweenFormElements,
                    flexDirection: "column",
                    justifyContent: "flex-start"
                })}
            >
                <Text style={Styles.formLabel}>{this.I18n.t("gpsCoordinates")}</Text>
                <View style={{flexDirection: "row"}}>
                    {!_.isNil(this.props.validationResult) ? this.renderGetLocationButton() : this.renderCoordinates()}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult} />
            </View>
        ) : (
            <View />
        );
    }
}

export default GeolocationFormElement;
