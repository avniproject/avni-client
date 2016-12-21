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
import {List, ListItem, Button, Content, CheckBox, Grid, Col, Row, Text, Container} from "native-base";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);

        var individualSearchCriteria = new IndividualSearchCriteria();
        this.state = {criteria: individualSearchCriteria, addressLevels: []};
    }

    viewName() {
        return "IndividualRegisterView";
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        const addressLevels = this.context.getService(EntityService).getAll(AddressLevel.schema.name);
        const titles = addressLevels.map((addressLevel) => {
            return addressLevel.title;
        });

        return (
            <Content>
                <Grid style={{marginTop: 16, marginHorizontal: 24}}>
                    <Row style={GlobalStyles.formElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("name")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}} onChangeText={(text) => this.state.criteria.name = text}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={GlobalStyles.formElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("age")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}}
                                           onChangeText={(text) => this.state.criteria.ageInYears = text}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={GlobalStyles.formElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("age")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}}
                                           onChangeText={(text) => this.state.criteria.ageInYears = text}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Button block onPress={() => this.registerIndividual()}>{I18n.t("register")}</Button>
                    {/*<Text>{I18n.t("lowestAddressLevel")}</Text>*/}
                    {/*<CheckBox checked={false}/>*/}
                    {/*<Text>Daily Stand Up</Text>*/}
                </Grid>
            </Content>
        );
    }

    registerIndividual() {
        const results = this.context.getService(IndividualService).search(this.state.criteria);
        TypedTransition.from(this).with({searchResults: results}).to(IndividualSearchResultsView);
    }
}

export default IndividualRegisterView;