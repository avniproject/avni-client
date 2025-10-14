import {Component} from "react";
import Realm from "realm";

const commentSchema = {
    name: "Comment",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        subject: {type: "object", objectType: "Individual"}
    },
};

const individualSchema = {
    name: "Individual",
    primaryKey: "uuid",
    properties: {
        uuid: "string",
        name: "string"
    },
};

class RealmIssuesApp extends Component {
    render() {
        const realmConfig = {
            schemaVersion: 1,
            schema: [commentSchema, individualSchema]
        };
        const realm = new Realm(realmConfig);
        const comment = {
            uuid: `foo${new Date()}`
        };
        realm.write(() => {
            realm.create("Comment", comment);
        })
    }
}

export default RealmIssuesApp;
