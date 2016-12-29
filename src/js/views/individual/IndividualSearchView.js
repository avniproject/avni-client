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

    renderAddressLevelCheckboxes(addressLevels) {
        return _.chunk(addressLevels, 2)
            .map(([address1, address2]) =>
                (<Row
                    style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        height: 360,
                        borderWidth: 1
                    }}>
                    <Col style={{flexGrow: 1}}>
                        <Row>
                            <CheckBox checked={address1.checked}
                                      onPress={this.toggleVillageSelection(address1)}/>
                            <Text style={{
                                fontSize: 16,
                                justifyContent: 'flex-start',
                                marginLeft: 11
                            }}>{address1.title}</Text>
                        </Row>
                    </Col>
                    <Col style={{flexGrow: 2}}/>
                    <Col style={{flexGrow: 1}}>
                        <Row>
                            <CheckBox checked={address2.checked} onPress={this.toggleVillageSelection(address2)}/>
                            <Text style={{
                                fontSize: 16,
                                justifyContent: 'flex-start',
                                marginLeft: 11
                            }}>{address2.title}</Text>
                        </Row>
                    </Col>
                </Row>)
            );
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
                        <Grid>
                            <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("lowestAddressLevel")}</Text>
                            </Row>
                            {this.renderAddressLevelCheckboxes(addressLevels)}
                        </Grid>
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

    toggleVillageSelection(addressLevel) {
        return ()=> {
            this.dispatchAction(addressLevel.checked ? Actions.REMOVE_ADDRESS_LEVEL_CRITERIA : Actions.ADD_ADDRESS_LEVEL_CRITERIA, {"address_level" : addressLevel.title});
        }
    }
}

export default IndividualSearchView;