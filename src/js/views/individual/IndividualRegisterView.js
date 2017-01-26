import {View, StyleSheet, ScrollView, TextInput, DatePickerAndroid, TouchableHighlight} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import IndividualService from "../../service/IndividualService";
import TypedTransition from "../../framework/routing/TypedTransition";
import DGS from "../primitives/DynamicGlobalStyles";
import {Content, CheckBox, Grid, Col, Row, Text, Container, Button, Radio} from "native-base";
import themes from "../primitives/themes";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/IndividualRegisterActions";
import _ from "lodash";
import General from "../../utility/General";
import LandingView from "../LandingView";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import AppHeader from '../common/AppHeader';

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, "individualRegister");
        this.contentGridMarginStyle = {marginTop: DGS.resizeHeight(16), marginHorizontal: DGS.resizeWidth(24)};
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "IndividualRegisterView";
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t('registration')}/>
                    <Grid style={this.contentGridMarginStyle}>
                        <Row>
                            <Col>
                                <Row>
                                    <Text style={DGS.formElementLabel}>{this.I18n.t("name")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DGS.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_NAME, {value: text})}/>
                                </Row>
                            </Col>
                        </Row>
                        <Row style={DGS.formRow}>
                            <Grid>
                                <Row>
                                    <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirth")}</Text>
                                </Row>
                                <Row>
                                    <Text onPress={this.showPicker.bind(this, 'simple', {date: this.state.individual.dateOfBirth})}
                                          style={[DGS.formElementTextInput, {marginRight: DGS.resizeWidth(50), fontSize: 16}]}>{this.dateDisplay(this.state.individual.dateOfBirth)}</Text>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <CheckBox checked={this.state.individual.dateOfBirthVerified}
                                                  onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_DOB_VERIFIED, {value: !this.state.individual.dateOfBirthVerified})}/>
                                    </View>
                                    <View style={{marginRight: DGS.resizeWidth(15)}}/>
                                    <Text style={DGS.formElementLabel}>{this.I18n.t("dateOfBirthVerified")}</Text>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={DGS.formRow}>
                            <Grid>
                                <Row>
                                    <Text style={DGS.formElementLabel}>{this.I18n.t("age")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DGS.formElementTextInput}
                                               onChangeText={(text) => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE, {value: text})}>{_.isNil(this.state.age) ? "" : this.state.age}</TextInput>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                                        <Radio selected={this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: true})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DGS.formRadioText}>{this.I18n.t("years")}</Text>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse', marginLeft: DGS.resizeWidth(20)}}>
                                        <Radio selected={!this.state.ageProvidedInYears}
                                               onPress={() => this.dispatchAction(Actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, {value: false})}/>
                                    </View>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Text style={DGS.formRadioText}>{this.I18n.t("months")}</Text>
                                    </View>
                                </Row>
                            </Grid>
                        </Row>
                        <Row style={DGS.formRow}>
                            <RadioGroup action={Actions.REGISTRATION_ENTER_GENDER}
                                        labelValuePairs={this.state.genders.map((gender) => new RadioLabelValue(gender.name, gender))}
                                        labelKey="gender"
                                        selectionFn={(gender) => gender.equals(this.state.individual.gender)}
                            />
                        </Row>
                        <Row style={DGS.formRow}>
                            <AddressLevels selectedAddressLevels={_.isNil(this.state.individual.lowestAddressLevel) ? [] : [this.state.individual.lowestAddressLevel]}
                                           multiSelect={false} actionName={Actions.REGISTRATION_ENTER_ADDRESS_LEVEL}/>
                        </Row>
                        <Row style={DGS.formRow}>
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