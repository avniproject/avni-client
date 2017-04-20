import {View, StyleSheet, ScrollView, TextInput, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import GlobalStyles from "../primitives/GlobalStyles";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import {Button, Content, Grid, Col, Row} from "native-base";
import AddressLevels from "../common/AddressLevels";
import Reducers from "../../reducer";
import {IndividualSearchActionNames as Actions} from '../../action/individual/IndividualSearchActions';

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualSearch);
    }

    viewName() {
        return 'IndividualSearchView';
    }

    render() {
        console.log('IndividualSearchView.render');
        return (
            <Content>
                <Grid style={{marginTop: 16, marginHorizontal: 24}}>
                    <Row style={GlobalStyles.formTextElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("name")}</Text>
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
                                <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("age")}</Text>
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
                                    onPress={() => this.searchIndividual()}>{this.I18n.t("search")}</Button>
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
            }).to(IndividualSearchResultsView, true)
        });
    }
}

export default IndividualSearchView;