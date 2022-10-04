import React, {Component} from 'react';
import {Text} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import {Individual} from 'openchs-models';

const db = RealmFactory.createRealm();

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
    }

    test() {
        const entitySyncStatuses = db.objects(Individual.schema.name);
        console.log("Playground-1", entitySyncStatuses.length);
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
