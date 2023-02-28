import React, {Component, useState} from 'react';
import {Text, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';
import SelectableItemGroup from "./views/primitives/SelectableItemGroup";
import RadioLabelValue from "./views/primitives/RadioLabelValue";
import CHSContainer from "./views/common/CHSContainer";

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

function SelectableGroup() {
    const labelValuePairs = [
        new RadioLabelValue("Item 1", "item1", false),
        new RadioLabelValue("Very very very long item 2", "item2", false),
        new RadioLabelValue("Very very very long item 3", "item3", false),
        new RadioLabelValue("Item 4", "item4", false)
    ];

    const singleLabelValuePairs = [
        new RadioLabelValue("Item 1", "item1", false)
    ]

    return (
        <CHSContainer>
            <SelectableItemGroup onPress={(value) => this.setState({value: value === this.state.value ? null : value})}
                                 selectionFn={(value) => this.state.value === value}
                                 labelValuePairs={singleLabelValuePairs} labelKey={"Selectable Group"}
                                 I18n={{t: _.identity}} locale={"en"} inPairs={true} allowUnselect={false} multiSelect={false}/>
        </CHSContainer>
    );
}

export default class App extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            value: "item1"
        }
    }

    render() {
        return <TxQueries/>;
    }
}
