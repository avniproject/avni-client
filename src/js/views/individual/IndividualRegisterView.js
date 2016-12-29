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
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import {List, ListItem, Content, CheckBox, Grid, Col, Row, Text, Container, Button, Radio} from "native-base";
import themes from "../primitives/themes";

@Path('/individualRegister')
class IndividualRegisterView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);

        var individualSearchCriteria = new IndividualSearchCriteria();
        this.state = {criteria: individualSearchCriteria, addressLevels: []};

        this.contentGridMarginStyle = {marginTop: DynamicGlobalStyles.resize(16), marginHorizontal: DynamicGlobalStyles.resize(24)};
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
            <Container theme={themes}>
                <Content>
                    <Grid style={this.contentGridMarginStyle}>
                        <Row>
                            <Col>
                                <Row>
                                    <Text style={DynamicGlobalStyles.formElementLabel}>{I18n.t("name")}</Text>
                                </Row>
                                <Row>
                                    <TextInput style={DynamicGlobalStyles.formElementTextInput} onChangeText={(text) => this.state.criteria.name = text}/>
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
                                               onChangeText={(text) => this.state.criteria.ageInYears = text}/>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <CheckBox/>
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
                                               onChangeText={(text) => this.state.criteria.ageInYears = text}/>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Radio/>
                                    </View>
                                    <Text>{I18n.t("years")}</Text>
                                    <View style={{flexDirection: 'column-reverse'}}>
                                        <Radio/>
                                    </View>
                                    <Text>{I18n.t("months")}</Text>
                                </Row>
                            </Grid>
                        </Row>
                        <Row>
                            <Col>
                                <Button block onPress={() => this.registerIndividual()}>{I18n.t("register")}</Button>
                            </Col>
                        </Row>
                        {/*<Text>{I18n.t("lowestAddressLevel")}</Text>*/}
                        {/*<CheckBox checked={false}/>*/}
                        {/*<Text>Daily Stand Up</Text>*/}
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