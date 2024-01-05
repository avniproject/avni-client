import React, {Component, useState} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';
import {TextField} from "native-base";

async function executeQuery(queryString, type, setOutput) {
    //waitForNotNULL(getDb)
    console.log("executeQuery", queryString);
    setOutput("Preparing db");
    let db = await RealmFactory.createRealm()
    if (db == null) {
        return -1000;
    }
    try {
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
    const [schema, setSchema] = useState("")

    return <View>
        <View style={{display: "flex", flexDirection: "row"}}>
            <Text>Entity Schema Name</Text>
            <TextInput onChangeText={(text) => setSchema(text)} value={schema} style={{backgroundColor: "grey"}}/>
        </View>

        <View style={{display: "flex", flexDirection: "row"}}>
            <Text>Query</Text>
            <TextInput multiline={true} onChangeText={(text) => setQuery(text)} value={query}  style={{backgroundColor: "grey"}}/>
        </View>
        <Text>{output}</Text>
        <View style={{display: "flex", flexDirection: "row", justifyContent: "space-around"}}>
            <Button onPress={() => executeQuery(query, schema, setOutput)} title="Run"/>
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
        return <View>
            <Text>Hello playground</Text>
            <TxQueries/>
        </View>;
    }
}
