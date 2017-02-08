import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import GlobalStyles from "../primitives/GlobalStyles";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import {Button, Content, CheckBox, Grid, Col, Row, Text} from "native-base";
import Actions from "../../action/index";
import AddressLevels from '../common/AddressLevels';
import IndividualEncounterService from "../../service/IndividualEncounterService";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, "individualSearch");
    }

    viewName() {
        return "IndividualSearchView";
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();

        return (
            <Content>
                <Grid style={{marginTop: 16, marginHorizontal: 24}}>
                    <Row style={GlobalStyles.formTextElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("name")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}}
                                           value={this.state.searchCriteria.name}
                                           onChangeText={(text) => this.dispatchAction(Actions.ENTER_NAME_CRITERIA, {"name": text})}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={GlobalStyles.formTextElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("age")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}}
                                           value={this.state.searchCriteria.age}
                                           onChangeText={(text) => this.dispatchAction(Actions.ENTER_AGE_CRITERIA, {"age": text})}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={GlobalStyles.formCheckboxElement}>
                        <AddressLevels multiSelect={true} selectedAddressLevels={this.state.searchCriteria.lowestAddressLevels} actionName={Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL}/>
                    </Row>
                    <Row style={{marginTop: 30, marginBottom: 30}}>
                        <Col>
                            <Button block
                                    onPress={() => this.searchIndividual()}>{I18n.t("search")}</Button>
                        </Col>
                    </Row>
                </Grid>
            </Content>
        );
    }

    searchIndividual() {
        this.dispatchAction(Actions.SEARCH_INDIVIDUALS, {
            cb: (results) => TypedTransition.from(this).with({
                searchResults: results
            }).to(IndividualSearchResultsView)
        });
    }
}

export default IndividualSearchView;