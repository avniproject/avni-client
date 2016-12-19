import {View, StyleSheet, ListView, ScrollView, TouchableNativeFeedback} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from "../../framework/routing/Path";
import {GlobalStyles} from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import AppHeader from "../primitives/AppHeader";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterView";
import {Container, Content, List, ListItem, Thumbnail, Grid, Row, Col, Text, Button} from 'native-base';
import Individual from "../../models/Individual"

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualSearchResultsView";
    }

    constructor(props, context) {
        super(props, context);
        this.I18n = this.context.getService(MessageService).getI18n();
    }

    renderRowAResult(individual, rowID) {
        return (
            <TouchableNativeFeedback onPress={() => this.onResultRowPress(individual)} key={`2${rowID}`}>
                <View style={GlobalStyles.listRow} key={`3${rowID}`}>
                    <Text>{individual.toSummaryString()}</Text>
                </View>
            </TouchableNativeFeedback>);
    }

    renderZeroResultsMessageIfNeeded() {
        if (this.props.params.searchResults.length === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('zeroNumberOfResults')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        const dsClone = ds.cloneWithRows(this.props.params.searchResults);
        return (
            <Container>
                <Content>
                    <List dataArray={this.props.params.searchResults}
                          renderRow={(item) =>
                              <ListItem>
                                  <Grid>
                                      <Col size={1.5}>
                                          <Thumbnail size={68}
                                                     source={require('../../../../android/app/src/main/res/mipmap-mdpi/Arvind_Kejriwal_777.jpg')}/>
                                      </Col>
                                      <Col size={5}>
                                          <Row><Text>{item.name}</Text></Row>
                                          <Row>
                                              <Text note>{item.gender.name + " | " + Individual.getDisplayAge(item)}</Text>
                                          </Row>
                                      </Col>
                                      <Col size={2}>
                                          <Row style={{justifyContent: 'flex-end'}}><Text>{item.lowestAddressLevel.title}</Text></Row>
                                          <Row style={{justifyContent: 'flex-end'}}><Button disabled  style={{width: 74, height: 22, backgroundColor: '#f6a623'}}>Nutrition</Button><Button disabled  style={{width: 74, height: 22, backgroundColor: '#4990e2'}}>Diabetes</Button></Row>
                                      </Col>
                                  </Grid>
                              </ListItem>
                          }>
                    </List>
                </Content>
            </Container>
        );
    }

    onResultRowPress(individual) {
        TypedTransition.from(this).with({individual: individual}).to(IndividualEncounterView);
    }
}

export default IndividualSearchResultsView;