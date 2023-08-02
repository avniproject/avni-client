import React, {Component, useState, useEffect} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';
import fs from 'react-native-fs';

import {Gender} from "openchs-models";
import getKey from "./framework/keychain/Keychain";
let isEncrypted = false;
async function executeQuery(queryString, type, setOutput) {
    //waitForNotNULL(getDb)
    console.log("executeQuery", queryString);
    setOutput("Preparing db");
    let db = await RealmFactory.getRealm(isEncrypted)
    if(db == null) {
        return -1000;
    }
    try {
        if (db.objects("Gender").length === 0) {
            setOutput("Populating Gender values in db");
            console.log("creating Gender objects")
            db.write(() => {
                db.create(Gender.schema.name, Gender.create("Male"), true);
                db.create(Gender.schema.name, Gender.create("Female"), true);
                db.create(Gender.schema.name, Gender.create("Transgender"), true);
            })
        }
        setOutput("Executing query");
        let objects = db.objects(type);
        if (!_.isEmpty(queryString))
            objects = objects.filtered(queryString);
        return setOutput(objects.map(_.identity).length);
    } catch (e) {
        console.error(e);
        return setOutput(-1);
    }
}

async function encryptRealm(setOutput) {
    if(isEncrypted) {
        setOutput("Already encrypted");
        console.log("Realm already encrypted doing nothing");
        return;
    }
    setOutput("Encrypt start");
    let db = await RealmFactory.getRealm(isEncrypted)
    console.log("going to get key....");
    const key = await getKey();
    let oldPath = db.path;
    let newPath = `${oldPath}.encrypted`;
    let newConfig = { encryptionKey: key, path: newPath};
    console.log("New config for encryption", newConfig);
    setOutput("Writing copy");
    db.writeCopyTo(newConfig);
    setOutput("Closing old db");
    db.close();
    await fs.moveFile(newPath, oldPath);
    isEncrypted = true;
    setOutput("Encryption complete")
}

async function decryptRealm(setOutput) {
    if(!isEncrypted) {
        setOutput("Already decrypted");
        console.log("Realm already decrypted doing nothing");
        return;
    }
    setOutput("Decrypt start");
    let db = await RealmFactory.getRealm(isEncrypted)
    let oldPath = db.path;
    let newPath = `${oldPath}.decrypted`;
    let newConfig = {path: newPath};
    console.log("New config for decryption", newConfig);
    setOutput("Writing copy");
    db.writeCopyTo(newConfig); //No key implies no encryption
    setOutput("Closing old db");
    db.close();
    setOutput("Moving realm file");
    await fs.moveFile(newPath, oldPath);
    isEncrypted = false;
    setOutput("Decryption complete")
}

function QueryAndOutput() {
    const [output, setOutput] = useState("-")
    const [query, setQuery] = useState("")

    return <View>
        <TextInput multiline={true} onChangeText={(text) => setQuery(text)} value={query}/>
        <Text>{output}</Text>
        <View style={{display: "flex", flexDirection: "row", justifyContent: "space-around"}}>
            <Button onPress={() => executeQuery(query, "Gender", setOutput)} title="Gender"/>
        </View>
        <View style={{marginTop: 20}}>
            <Button onPress={() => {
                setQuery('');
                setOutput('-');
            }} title="CLEAR"/>
        </View>
        <View style={{marginTop: 20}}>
            <Button onPress={() => {
                encryptRealm(setOutput)
            }} title="ENCRYPT"/>
        </View>
        <View style={{marginTop: 20}}>
            <Button onPress={() => {
                decryptRealm(setOutput)
            }} title="DECRYPT"/>
        </View>
    </View>
}

function TxQueries() {
    return <QueryAndOutput/>;
}


export default class Playground extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            value: "item1"
        }
    }

    render() {
        console.log("======================================>>>>>>>>>>>>>>>>>>>Rendering playground");
        return  <View>
            <Text>Hello playground</Text>
            <TxQueries/>
        </View>;
    }
}
