import React, {Component} from 'react';
import {Text} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import {Individual} from 'openchs-models';
import _ from 'lodash';

const db = RealmFactory.createRealm();

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
    }

    test() {
        const encounters = db.objects("Encounter").filtered("uuid = $0", "0d84bf5d-29c7-4ada-b957-6992064033e1").map(_.identity);
        console.log("Playground-1", encounters[0].observations);
    }

    render() {
        this.test();
        return (
            <Text>
                This is your playground to try out new components.
                You can go to the default app by adding PLAYGROUND=false in your .env file.
            </Text>
        );
    }
}
