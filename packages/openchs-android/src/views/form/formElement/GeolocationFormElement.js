import React from "react";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Styles from "../../primitives/Styles";
import Geo from "../../../framework/geo";
import {View, Text} from "react-native";
import Geolocation from "react-native-geolocation-service";
import Colors from "../../primitives/Colors";
import ValidationErrorMessage from "../ValidationErrorMessage";
import General from "../../../utility/General";
import Distances from "../../primitives/Distances";

class GeolocationFormElement extends AbstractComponent {
    static propTypes = {
        actionName: React.PropTypes.string.isRequired,
        location: React.PropTypes.object,
        editing: React.PropTypes.bool.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.getPosition = this.getPosition.bind(this);
    }

    componentWillMount() {
        if(!this.props.editing) {
            this.getPosition();
        }
    }

    async getPosition() {
        const hasPermission = await Geo.askLocationPermission();
        console.log(`has permission ${hasPermission}`);
        if (!hasPermission) return;

        console.log("requesting position");
        Geolocation.getCurrentPosition(
            position => {
                this.dispatchAction(this.props.actionName, {value: position});
            },
            error => {
                General.logError('GeolocationFormElement', error);
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
        );
    }

    render() {
        General.logDebug('GeolocationFormElement', `render, props: editing ${this.props.editing}`)
        const location = this.props.location;
        return (
            <View style={this.appendedStyle({paddingTop: Distances.VerticalSpacingBetweenFormElements, flexDirection: "column", justifyContent: "flex-start"})}>
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
                    {location != null ? `${location.x} , ${location.y}` : ""}
                </Text>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}

export default GeolocationFormElement;
