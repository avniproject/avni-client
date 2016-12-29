import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import {GlobalStyles} from "../primitives/GlobalStyles";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import {Button, Content, CheckBox, Grid, Col, Row, Text} from "native-base";
import Actions from "../../action/index";
import AddressLevels from '../common/AddressLevels';
import _ from 'lodash';

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
        this.unsubscribe = context.getStore().subscribe(this.handleChange.bind(this));
    }

    viewName() {
        return "IndividualSearchView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.START_NEW_INDIVIDUAL_SEARCH);
    }

    handleChange() {
        this.setState(this.context.getStore().getState().individualSearch);
    }

    render() {
        console.log("IndividualSearchView.render");
        const I18n = this.context.getService(MessageService).getI18n();
        let addressLevels = this.state.addressLevels.map((addressLevel) =>
            Object.assign({checked: this.state.searchCriteria.lowestAddressLevels.has(addressLevel.title)}, addressLevel));
        console.log(addressLevels);
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
                        <AddressLevels addressLevels={addressLevels}/>
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