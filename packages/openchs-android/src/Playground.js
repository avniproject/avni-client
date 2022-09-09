import React, {Component} from 'react';
import Realm from 'realm';
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import {Text} from "react-native";
import {Documentation, DocumentationItem, LocaleMapping, Settings} from "openchs-models";
import RealmExamples from "./codeExamples/RealmExamples";

let db = undefined;

export const createRealmConfig = function () {
    return {
        schema: [Settings.schema, LocaleMapping.schema, Documentation.schema, DocumentationItem.schema],
        schemaVersion: 2,
        migration: () => {}
    }
};

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        if (db === undefined) {
            console.log("Creating realm config");
            db = new Realm(createRealmConfig());
            console.log("Created realm config");
        }
    }

    test() {
        RealmExamples.doesSaveCascadesForDisconnectedGraph(db);
    }

    render() {
        this.test();
        return (<CHSContainer>
            <CHSContent>
                <Text>
                    This is your playground to try out new components.
                    You can go to the default app by adding PLAYGROUND=false in your .env file.
                </Text>
            </CHSContent>
        </CHSContainer>)
    }
}
