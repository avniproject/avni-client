import React, {Component, useState, useEffect} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';

import {Gender} from "openchs-models";

function executeQuery(queryString, type, db) {
    //waitForNotNULL(getDb)
    console.log("executeQuery", queryString);
    if(db == null) {
        return -1000;
    }
    try {
        if (db.objects("Gender").length === 0) {
            console.log("creating Gender objects")
            db.write(() => {
                db.create(Gender.schema.name, Gender.create("Male"), true);
                db.create(Gender.schema.name, Gender.create("Female"), true);
                db.create(Gender.schema.name, Gender.create("Transgender"), true);
            })
        }
        let objects = db.objects(type);
        if (!_.isEmpty(queryString))
            objects = objects.filtered(queryString);
        return objects.map(_.identity).length;
    } catch (e) {
        console.error(e);
        return -1;
    }
}

function QueryAndOutput() {
    const [output, setOutput] = useState("-")
    const [query, setQuery] = useState("")
    const [db, setDb] = useState({})
    useEffect(() => {
        async function foo() {
            setDb(await RealmFactory.createRealmWithEncryptionKey());

        }
        foo();
    }, [])
    return <View>
        <TextInput multiline={true} onChangeText={(text) => setQuery(text)} value={query}/>
        <Text>{output}</Text>
        <View style={{display: "flex", flexDirection: "row", justifyContent: "space-around"}}>
            <Button onPress={() => setOutput(executeQuery(query, "Gender", db))} title="Gender"/>
            {/*<Button onPress={() => setOutput(executeQuery(query, "ProgramEnrolment", db))} title="Enrolment"/>*/}
            {/*<Button onPress={() => setOutput(executeQuery(query, "ProgramEncounter", db))} title="P Enc"/>*/}
            {/*<Button onPress={() => setOutput(executeQuery(query, "Observation", db))} title="Obs"/>*/}
            {/*<Button onPress={() => setOutput(executeQuery(query, "Observation", db))} title="Rand"/>*/}
        </View>
        <View style={{marginTop: 20}}>
            <Button onPress={() => {
                setQuery("");
                setOutput("-");
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
