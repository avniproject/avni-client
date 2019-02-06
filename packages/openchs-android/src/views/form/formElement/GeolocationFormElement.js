import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Styles from "../../primitives/Styles";
import Geo from "../../../framework/geo";
import {View, Text} from "react-native";
import Geolocation from "react-native-geolocation-service";
import Colors from "../../primitives/Colors";
import {Actions} from "../../../action/individual/IndividualRegisterActions";
import ValidationErrorMessage from "../ValidationErrorMessage";

class GeolocationFormElement extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.getPermission = this.getPermission.bind(this);
    }

    async getPermission() {
        const hasPermission = await Geo.askLocationPermission();
        console.log(`permission ${hasPermission}`);
        if (!hasPermission) return;

        console.log("requesting location");
        Geolocation.getCurrentPosition(
            position => {
                this.dispatchAction(Actions.REGISTRATION_SET_LOCATION, {value: position});
                console.log(`succeed ${JSON.stringify(position)} ${position.coords.latitude}`);
            },
            error => {
                console.log(`error ${JSON.stringify(error)}`);
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
        );
    }

    render() {
        const registrationLocation = this.props.state.individual.registrationLocation;
        return (
            <View style={{flexDirection: "column", justifyContent: "flex-start"}}>
                <Text style={Styles.formLabel} onPress={this.getPermission}>
                    GPS Coordinates
                </Text>
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
                    {registrationLocation != null ? `${registrationLocation.x} , ${registrationLocation.y}` : ""}
                </Text>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}

export default GeolocationFormElement;
