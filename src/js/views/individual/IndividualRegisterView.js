import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import IndividualService from "../../service/IndividualService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import {Content, CheckBox, Grid, Col, Row, Text, Container, Button, Radio} from "native-base";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
        this.contentGridMarginStyle = {marginTop: DynamicGlobalStyles.resize(16), marginHorizontal: DynamicGlobalStyles.resize(24)};
        this.unsubscribe = context.getStore().subscribe(this.refreshState.bind(this));
    }

    viewName() {
        return "IndividualRegisterView";
    }

    componentWillMount() {
        this.refreshState();
    }

    refreshState() {
        this.setState(this.getContextState("individualRegister"));
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();

        return (
            <Container theme={themes}>
                <Content>
                    <Grid style={this.contentGridMarginStyle}>
                        <Row>
                            <Col>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("name")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DynamicGlobalStyles.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_NAME, {value: text})}/>
                                </Row>
                            </Col>
                        </Row>
                        <Row>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("dateOfBirth")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={{flex: 1, height: DynamicGlobalStyles.resizeHeight(44), marginRight: DynamicGlobalStyles.resize(50)}}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB, {value: text})}>{this.state.individual.dateOfBirth}</TextInput>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <CheckBox checked={this.state.individual.dateOfBirthVerified}
                                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.state.individual.dateOfBirthVerified})}/>
                                    </View>
                                    <View style={{marginRight: DynamicGlobalStyles.resize(15)}}/>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("dateOfBirthVerified")}</Text>
                                </Row>
                            </Grid>
                        </Row>
                        <Row>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("age")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DynamicGlobalStyles.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}>{this.state.age}</TextInput>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Radio selected={this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: true})}/>
                                    </View>
                                    <Text>{I18n.t("years")}</Text>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Radio selected={!this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                                    </View>
                                    <Text>{I18n.t("months")}</Text>
                                </Row>
                            </Grid>
                        </Row>
                        <Row>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("gender")}</Text>
                                </Row>
                                {this.state.genders.map((gender) => {
                                    return (
                                        <Row>
                                            <View style={{flexDirection: 'column-reverse'}}>
                                                <Radio selected={gender.equals(this.state.individual.gender)}
                                                       onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: gender})}/>
                                            </View>
                                            <Text>{I18n.t(gender.name)}</Text>
                                        </Row>);
                                })}
                            </Grid>
                        </Row>
                        <Row>
                            <AddressLevels selectedAddressLevels={_.isNil(this.state.individual.lowestAddressLevel) ? [] : [this.state.individual.lowestAddressLevel]}
                                           multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}/>
                        </Row>
                        <Row>
                            <Col>
                                <Button block onPress={() => this.registerIndividual()}>{I18n.t("register")}</Button>
                            </Col>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }

    registerIndividual() {
        const results = this.context.getService(IndividualService).search(this.state.criteria);
        TypedTransition.from(this).with({searchResults: results}).to(IndividualSearchResultsView);
    }
}

export default IndividualRegisterView;