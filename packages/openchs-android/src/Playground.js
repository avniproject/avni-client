import React, {Component} from 'react';
import Realm from 'realm';
import CHSContainer from "./views/common/CHSContainer";
import CHSContent from "./views/common/CHSContent";
import {Text} from "react-native";
import InitialSettings from "../config/initialSettings.json";
import Config from "./framework/Config";
import {Settings, LocaleMapping} from "openchs-models";

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
        //order is important, should be arranged according to the dependency
        schema: [Settings, LocaleMapping],
        schemaVersion: 1,
        migration: () => {}
    }
};

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        if (db === undefined) {
            db = new Realm(createRealmConfig());
        }
    }

    createIfNotExists() {
        if (db.objects(Settings).length < 1) {
            db.write(() => {
                const settings = new Settings();
                settings.uuid = Settings.UUID;
                settings.password = "";
                settings.logLevel = InitialSettings.logLevel;
                settings.pageSize = InitialSettings.pageSize;
                settings.serverURL = Config.SERVER_URL;
                settings.poolId = "";
                settings.clientId = Config.CLIENT_ID || "";
                db.create('Settings', settings, true);
            });
        }
    }

    render() {
        this.createIfNotExists();
        const objects = db.objects(Settings);

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
            </CHSContent>
        </CHSContainer>)
    }
}
