import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Styles from "../../primitives/Styles";
import Geo from "../../../framework/geo";
import {View, Text} from "react-native";
import Geolocation from "react-native-geolocation-service";
import Colors from "../../primitives/Colors";
import {Actions} from "../../../action/individual/IndividualRegisterActions";
import ValidationErrorMessage from "../ValidationErrorMessage";
import General from "../../../utility/General";

class GeolocationFormElement extends AbstractComponent {
    static propTypes = {
        validationResult: React.PropTypes.object,
        state: React.PropTypes.object.isRequired,
        loadFromGps: React.PropTypes.bool.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.getPosition = this.getPosition.bind(this);
    }

    componentWillMount() {
        if(this.props.loadFromGps) {
            this.getPosition();
        }
        return super.componentWillMount();
    }

    async getPosition() {
        const hasPermission = await Geo.askLocationPermission();
        console.log(`has permission ${hasPermission}`);
        if (!hasPermission) return;

        console.log("requesting position");
        Geolocation.getCurrentPosition(
            position => {
                this.dispatchAction(Actions.REGISTRATION_SET_LOCATION, {value: position});
            },
            error => {
                General.logError('GeolocationFormElement', error);
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
        );
    }

    render() {
        const registrationLocation = this.props.state.individual.registrationLocation;
        return (
            <View style={{flexDirection: "column", justifyContent: "flex-start"}}>
                <Text style={Styles.formLabel}>
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
