import React, {Component, useState} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';

import {Gender} from "openchs-models";

async function executeQuery(queryString, type, setOutput) {
    //waitForNotNULL(getDb)
    console.log("executeQuery", queryString);
    setOutput("Preparing db");
    let db = await RealmFactory.createRealm()
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
