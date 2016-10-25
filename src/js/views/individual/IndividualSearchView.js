import {View, StyleSheet, ScrollView, TextInput, Text} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import * as CHSStyles from "../primitives/GlobalStyles";
import Path from "../../framework/routing/Path";
import AppHeader from '../primitives/AppHeader';
import MessageService from "../../service/MessageService";
import ReferenceDataService from "../../service/ReferenceDataService";
import AddressLevel from "../../models/AddressLevel";
import AnswerList from "../../views/questionAnswer/AnswerList";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import IndividualService from "../../service/IndividualService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);

        var individualSearchCriteria = new IndividualSearchCriteria();
        this.state = {criteria: individualSearchCriteria, addressLevels: []};
    }

    viewName() {
        return "IndividualSearchView";
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        const addressLevels = this.context.getService(ReferenceDataService).getAll(AddressLevel.schema.name);
        const titles = addressLevels.map((addressLevel) => {
            return addressLevel.title;
        });

        return (
            <View style={{flex: 1}} keyboardShouldPersistTaps={true}>
                <AppHeader title={I18n.t("individualSearch")} parent={this}/>
                <ScrollView style={[CHSStyles.Global.mainSection]} keyboardShouldPersistTaps={true}>
                    <View>
                        <Text>{I18n.t("name")}</Text>
                        <TextInput onChangeText={(text) => this.state.criteria.name = text}></TextInput>
                    </View>
                    <View>
                        <Text>{I18n.t("age")}</Text>
                        <TextInput keyboardType='numeric' onChangeText={(text) => this.state.criteria.ageInYears = text}></TextInput>
                    </View>
                    <View>
                        <Text>{I18n.t("lowestAddressLevel")}</Text>
                        <AnswerList answers={titles}
                                    isMultiSelect={false} currentAnswers={this.state.addressLevels}
                                    answerHolder={this.state}/>
                    </View>
                    <View>
                        <Text onPress={() => this.searchIndividual()}>{I18n.t("search")}</Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    searchIndividual() {
        this.state.criteria.lowestAddressLevel = this.state.currentAnswerValue;
        const results = this.context.getService(IndividualService).search(this.state.criteria);
        TypedTransition.from(this).with({searchResults: results}).to(IndividualSearchResultsView);
    }
}

export default IndividualSearchView;