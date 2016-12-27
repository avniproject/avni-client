import {View, StyleSheet, ScrollView, TextInput} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import MessageService from "../../service/MessageService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import {GlobalStyles} from "../primitives/GlobalStyles";
import {Button, Content, CheckBox, Grid, Col, Row, Text} from "native-base";
import Actions from "../../action/index";

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
        this.setState({
            addressLevels: this.context.getStore().getState().individualSearch.addressLevels,
            searchCriteria: this.context.getStore().getState().individualSearch.searchCriteria,
            loading: false
        });
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
        const addressLevelTitles = this.state.addressLevels.map((addressLevel) => {
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
                                <TextInput style={{flex: 1}}
                                           value={this.state.searchCriteria.name}
                                           onChangeText={(text) => {
                                                this.dispatchAction(Actions.ENTER_NAME_CRITERIA, {"name": text});
                                }}></TextInput>
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
                                           value={this.state.searchCriteria.age}
                                           onChangeText={(text) => {
                                               this.dispatchAction(Actions.ENTER_NAME_CRITERIA, {"age": text});
                                           }}></TextInput>
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
        this.dispatchAction(Actions.SEARCH_INDIVIDUALS);
        TypedTransition.from(this).to(IndividualSearchResultsView);
    }
}

export default IndividualSearchView;