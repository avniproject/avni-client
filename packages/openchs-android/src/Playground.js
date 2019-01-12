
import React, {Component} from "react";
import {Text} from "react-native";

export default class Playground extends Component {
    render() {
        return (
            <Text>
                This is your playground to try out new components.
                You can go to the default app by adding playground=false in your .env file.
            </Text>
        )
    }
}
