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

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);

        const individualSearchCriteria = new IndividualSearchCriteria();
        this.state = {criteria: individualSearchCriteria, addressLevels: []};
    }

    viewName() {
        return "IndividualSearchView";
    }

    renderAddressLevelCheckboxes(addressLevelTitles) {
        var jsx = [];
        for (var i = 0; i < addressLevelTitles.length;) {
            jsx.push((<Row style={{backgroundColor: '#009688', height: 36}}>
                <Col style={{flexGrow: 1}}>
                    <Row>
                        <CheckBox/>
                        <Text style={{fontSize: 16, justifyContent: 'flex-start', marginLeft: 11}}>{addressLevelTitles[i++]}</Text>
                    </Row>
                </Col>
                <Col style={{flexGrow: 2}}/>
                <Col style={{flexGrow: 1}}>
                    <Row>
                        <CheckBox/>
                        <Text style={{fontSize: 16, justifyContent: 'flex-start', marginLeft: 11}}>{addressLevelTitles[i++]}</Text>
                    </Row>
                </Col>
            </Row>));
        }
        return jsx;
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        const addressLevels = this.context.getService(EntityService).getAll(AddressLevel.schema.name);
        const addressLevelTitles = addressLevels.map((addressLevel) => {
            return addressLevel.title;
        });

        return (
            <Content>
                <Grid style={{marginTop: 16, marginHorizontal: 24}}>
                    <Row style={GlobalStyles.formTextElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("name")}</Text>
                            </Row>
                            <Row style={GlobalStyles.formElementTextContainer}>
                                <TextInput style={{flex: 1}} onChangeText={(text) => this.state.criteria.name = text}/>
                            </Row>
                        </Grid>
                    </Row>
                    <Row style={GlobalStyles.formTextElement}>
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
                    <Row style={GlobalStyles.formCheckboxElement}>
                        <Grid>
                            <Row style={GlobalStyles.formElementLabelContainer}>
                                <Text style={GlobalStyles.formElementLabel}>{I18n.t("lowestAddressLevel")}</Text>
                            </Row>
                            {this.renderAddressLevelCheckboxes(addressLevelTitles)}
                        </Grid>
                    </Row>
                    <Button block onPress={() => this.searchIndividual()}>{I18n.t("search")}</Button>
                    {/*<CheckBox checked={false}/>*/}
                    {/*<Text>Daily Stand Up</Text>*/}
                </Grid>
            </Content>
        );
    }

    searchIndividual() {
        // this.state.criteria.lowestAddressLevel = this.state.currentAnswerValue;
        this.state.criteria.name = "ra";
        const results = this.context.getService(IndividualService).search(this.state.criteria);
        TypedTransition.from(this).with({searchResults: results}).to(IndividualSearchResultsView);
    }
}

export default IndividualSearchView;