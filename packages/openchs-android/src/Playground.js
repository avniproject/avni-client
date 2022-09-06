import React, {Component} from 'react';
import Realm from 'realm';
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import {Text, LogBox} from "react-native";
import InitialSettings from "../config/initialSettings.json";
import Config from "./framework/Config";
import {Settings, LocaleMapping, Documentation, DocumentationItem} from "openchs-models";
import RealmExamples from "./codeExamples/RealmExamples";
import _ from 'lodash';

let db = undefined;

// class Settings {
//     static UUID = "875f2255-d9f2-4eb6-841b-dd1d537aa512";
//     uuid;
//     serverURL;
//     locale;
//     logLevel;
//     pageSize;
//     poolId;
//     clientId;
//     devSkipValidation;
//     captureLocation;
//     userId;
//
//     static schema = {
//         name: "Settings",
//         primaryKey: "uuid",
//         properties: {
//             uuid: "string",
//             serverURL: "string",
//             locale: { type: "LocaleMapping" },
//             logLevel: "int",
//             pageSize: "int",
//             poolId: "string",
//             clientId: "string",
//             devSkipValidation: {type: "bool", default: false},
//             captureLocation: {type: "bool", default: true},
//             userId: {type: "string", optional: true},
//         },
//     };
// }
//
// class LocaleMapping {
//     static schema = {
//         name: "LocaleMapping",
//         primaryKey: "uuid",
//         properties: {
//             uuid: "string",
//             locale: "string",
//             displayText: "string",
//         },
//     };
// }

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

    createIfNotExists() {
        RealmExamples.parentChildWithCyclicRelationshipSaveTogether(db);

        console.log("Creating settings");
        if (db.objects(Settings.schema.name).length < 1) {
            db.write(() => {
                const settings = new Settings();
                settings.uuid = Settings.UUID;
                settings.logLevel = InitialSettings.logLevel;
                settings.pageSize = InitialSettings.pageSize;
                settings.serverURL = Config.SERVER_URL;
                settings.poolId = "testPool";
                settings.clientId = Config.CLIENT_ID || "";
                db.create(Settings.schema.name, settings, true);
            });
        }
    }

    render() {
        this.createIfNotExists();
        const documentations = RealmExamples.loadParentChild(db);
        documentations[0].documentationItems.forEach((x) => console.log(x.content));
        const objects = db.objects(Settings.schema.name);


        return (<CHSContainer>
            <CHSContent>
                <Text>
                    This is your playground to try out new components.
                    You can go to the default app by adding PLAYGROUND=false in your .env file.
                </Text>
                <Text>objects.length</Text>
                <Text>{objects.length}</Text>

                <Text>setting.uuid</Text>
                <Text>{objects[0].uuid}</Text>
                <Text>{objects[0].poolId}</Text>
            </CHSContent>
        </CHSContainer>)
    }
}
