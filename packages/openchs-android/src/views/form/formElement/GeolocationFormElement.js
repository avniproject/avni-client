import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Styles from "../../primitives/Styles";
import {PermissionsAndroid, Platform, View} from "react-native";
import Geolocation from "react-native-geolocation-service";
import Colors from "../../primitives/Colors";
import ValidationErrorMessage from "../ValidationErrorMessage";
import General from "../../../utility/General";
import Distances from "../../primitives/Distances";
import {Button, Text, Icon} from "native-base";
import Geo from "../../../framework/geo";
import UserInfoService from "../../../service/UserInfoService";

class GeolocationFormElement extends AbstractComponent {
    static propTypes = {
        actionName: PropTypes.string.isRequired,
        errorActionName: PropTypes.string.isRequired,
        location: PropTypes.object,
        editing: PropTypes.bool.isRequired,
        validationResult: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.getPosition = this.getPosition.bind(this);
        this.trackLocation = context.getService(UserInfoService).getUserInfo().getSettings().trackLocation;
    }

    componentDidMount() {
        if (!this.props.editing && this.trackLocation) {
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
        if (hasPermission) {
            Geolocation.getCurrentPosition(
                position => {
                    this.dispatchAction(this.props.actionName, {value: position});
                },
                error => {
                    this.dispatchAction(this.props.errorActionName, {value: error});
                    General.logWarn("GeolocationFormElement", error);
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
        return this.trackLocation ? (
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
