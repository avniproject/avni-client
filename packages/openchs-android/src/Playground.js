import React, {Component, useState} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';

const db = RealmFactory.createRealm();

function executeQuery(queryString, type) {
    console.log("executeQuery", queryString);
    try {
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

    return <View>
        <TextInput multiline={true} onChangeText={(text) => setQuery(text)} value={query}/>
        <Text>{output}</Text>
        <View style={{display: "flex", flexDirection: "row", justifyContent: "space-around"}}>
            <Button onPress={() => setOutput(executeQuery(query, "Individual"))} title="Ind"/>
            <Button onPress={() => setOutput(executeQuery(query, "ProgramEnrolment"))} title="Enrolment"/>
            <Button onPress={() => setOutput(executeQuery(query, "ProgramEncounter"))} title="P Enc"/>
            <Button onPress={() => setOutput(executeQuery(query, "Observation"))} title="Obs"/>
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
    return <>
        <QueryAndOutput type="ProgramEncounter"/>
    </>
}

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
    }

    test() {
        console.log("Playground-1");
        const encounters = db.objects("ProgramEncounter")
            .filtered(`SUBQUERY(observations, $concept,  (concept.uuid == 'e19e68fd-97f1-4803-a1b2-bb850836ff54')).@count > 0`).map(_.identity);
        console.log("Playground-1", encounters[0].observations);
    }

    render() {
        return (
            <>
                <Text>
                    This is your playground to try out new components
                </Text>
                <TxQueries/>
            </>
        );
    }
}
