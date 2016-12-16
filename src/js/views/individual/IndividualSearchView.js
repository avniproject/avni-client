import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import AddressLevel from "../../models/AddressLevel";
import IndividualSearchCriteria from "../../service/query/IndividualSearchCriteria";
import IndividualService from "../../service/IndividualService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import EntityService from "../../service/EntityService";
import {GlobalStyles} from '../primitives/GlobalStyles';
import {List, ListItem, Button, Content, CheckBox, Grid, Col, Row, Text} from "native-base";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static style = {
        inputGroup: {marginTop: 37, flex: 1},
    };

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
        const addressLevels = this.context.getService(EntityService).getAll(AddressLevel.schema.name);
        const titles = addressLevels.map((addressLevel) => {
            return addressLevel.title;
        });

        return (
            <Content style={GlobalStyles.mainContent}>
                <Grid style={{marginTop: 32}}>
                    <Row style={GlobalStyles.formElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text>{I18n.t("name")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}} onChangeText={(text) => this.state.criteria.name = text}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={IndividualSearchView.style.formElement}>
                        <Col>
                            <Text>{I18n.t("age")}</Text>
                            <TextInput style={{flex: 1}} onChangeText={(text) => this.state.criteria.ageInYears = text}/>
                        </Col>
                    </Row>
                    <Button block onPress={() => this.searchIndividual()}>{I18n.t("search")}</Button>
                    {/*<Row style={{backgroundColor: '#00f', height: 100}}>*/}
                        {/*<Text>{I18n.t("lowestAddressLevel")}</Text>*/}
                        {/*<CheckBox checked={false}/>*/}
                        {/*<Text>Daily Stand Up</Text>*/}
                    {/*</Row>*/}
                </Grid>
            </Content>
        );
    }

    searchIndividual() {
        // this.state.criteria.lowestAddressLevel = this.state.currentAnswerValue;
        const results = this.context.getService(IndividualService).search(this.state.criteria);
        TypedTransition.from(this).with({searchResults: results}).to(IndividualSearchResultsView);
    }
}

export default IndividualSearchView;