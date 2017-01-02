import {View, StyleSheet, ScrollView, TextInput, DatePickerAndroid, TouchableHighlight} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import IndividualService from "../../service/IndividualService";
import TypedTransition from "../../framework/routing/TypedTransition";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import {Content, CheckBox, Grid, Col, Row, Text, Container, Button, Radio} from "native-base";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import General from "../../utility/General";
import LandingView from "../LandingView";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, "individualRegister");
        this.contentGridMarginStyle = {marginTop: DynamicGlobalStyles.resizeHeight(16), marginHorizontal: DynamicGlobalStyles.resizeWidth(24)};
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "IndividualRegisterView";
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <Grid style={this.contentGridMarginStyle}>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <Col>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("name")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DynamicGlobalStyles.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_NAME, {value: text})}/>
                                </Row>
                            </Col>
                        </Row>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("dateOfBirth")}</Text>
                                </Row>
                                <Row>
                                    <Text onPress={this.showPicker.bind(this, 'simple', {date: this.state.individual.dateOfBirth})}
                                          style={[DynamicGlobalStyles.formElementTextInput, {marginRight: DynamicGlobalStyles.resizeWidth(50), fontSize: 16}]}>{this.dateDisplay(this.state.individual.dateOfBirth)}</Text>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <CheckBox checked={this.state.individual.dateOfBirthVerified}
                                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.state.individual.dateOfBirthVerified})}/>
                                    </View>
                                    <View style={{marginRight: DynamicGlobalStyles.resizeWidth(15)}}/>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("dateOfBirthVerified")}</Text>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("age")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DynamicGlobalStyles.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}>{_.isNil(this.state.age) ? "" : this.state.age}</TextInput>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DynamicGlobalStyles.resizeWidth(20)}}>
                                        <Radio selected={this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: true})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DynamicGlobalStyles.formRadioText}>{this.I18n.t("years")}</Text>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DynamicGlobalStyles.resizeWidth(20)}}>
                                        <Radio selected={!this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DynamicGlobalStyles.formRadioText}>{this.I18n.t("months")}</Text>
                                    </View>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <Grid>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.I18n.t("gender")}</Text>
                                </Row>
                                {this.state.genders.map((gender) => {
                                    return (
                                        <Row>
                                            <View style={{flexDirection: 'column-reverse'}}>
                                                <Radio selected={gender.equals(this.state.individual.gender)}
                                                       onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, {value: gender})}/>
                                            </View>
                                            <Text style={DynamicGlobalStyles.formRadioText}>{this.I18n.t(gender.name)}</Text>
                                        </Row>);
                                })}
                            </Grid>
                        </Row>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <AddressLevels selectedAddressLevels={_.isNil(this.state.individual.lowestAddressLevel) ? [] : [this.state.individual.lowestAddressLevel]}
                                           multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}/>
                        </Row>
                        <Row style={DynamicGlobalStyles.formRow}>
                            <Col>
                                <Button block onPress={this.registerIndividual()}>{this.I18n.t("register")}</Button>
                            </Col>
                        </Row>
                    </Grid>
                </Content>
            </Container>
        );
    }

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(Actions.REGISTRATION_ENTER_DOB, {value: new Date(year, month, day)});
        }
    }

    registerIndividual() {
        return () => {
            const results = this.context.getService(IndividualService).register(this.state.individual);
            TypedTransition.from(this).to(LandingView);
        };
    }
}

export default IndividualRegisterView;