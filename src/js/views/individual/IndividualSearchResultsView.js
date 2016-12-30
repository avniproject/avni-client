import AbstractComponent from '../../framework/view/AbstractComponent';
import {View} from 'react-native';
import React from 'react';
import Path from "../../framework/routing/Path";
import {GlobalStyles} from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterView from "./IndividualEncounterLandingView";
import {Container, Content, List, ListItem, Thumbnail, Grid, Row, Col, Text, Button, Header, Title, Icon} from 'native-base';
import Individual from "../../models/Individual";
import moment from "moment";
import themes from "../primitives/themes"

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

    renderProgram(program, index) {
        //TODO this code to go away when association of colour is done with programs
        var colour = "#f6a623";
        if (index % 3 === 0) {
            colour = "#4990e2"
        }
        else if (index % 3 === 1) {
            colour = "#4caf50"
        }

        return (
            <Button disabled style={{marginLeft: 8, width: 74, height: 22, backgroundColor: colour}}>{program.name}</Button>
        );
    }

    getImage(individual) {
        if (individual.gender.name === 'Male') {
            if (moment().diff(individual.dateOfBirth, 'years') > 30) {
                return <Thumbnail size={68} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/narendra_modi.png")}/>
            }
            else {
                return <Thumbnail size={68} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/arvind_kejriwal.jpg")}/>
            }
        }
        else if (individual.gender.name === 'Female') {
            return <Thumbnail size={68} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                              source={require("../../../../android/app/src/main/res/mipmap-mdpi/mamta.jpg")}/>
        }
    }

    render() {
        return (
            <Container theme={themes}>
                <Header style={{backgroundColor: '#212121'}}>
                    <Button transparent onPress={() => {
                        TypedTransition.from(this).goBack()
                    }}>
                        <Icon name='keyboard-arrow-left'/>
                    </Button>
                    <Title>{this.I18n.t("searchResults")}</Title>
                </Header>
                <Content>
                    <List dataArray={this.props.params.searchResults}
                          renderRow={(item) =>
                              <ListItem key={item.uuid}
                                        style={{backgroundColor: '#f7f7f7', marginLeft: 0, paddingLeft: 17, padding: 17, height: 102}}
                                        onPress={() => this.onResultRowPress(item)}>
                                  <Grid>
                                      <Col style={{width: 68}}>
                                          {this.getImage(item)}
                                      </Col>
                                      <Col style={{paddingLeft: 16}}>
                                          <Row><Text style={{fontSize: 16}}>{item.name}</Text></Row>
                                          <Row>
                                              <Text style={{fontSize: 12}} note>{item.gender.name}</Text>
                                              <Text style={{paddingLeft: 8, paddingRight: 8}}>|</Text>
                                              <Text style={{fontSize: 12}} note>{item.getAge().toString()}</Text>
                                          </Row>
                                      </Col>
                                      <Col style={{width: 246}}>
                                          <Row style={{justifyContent: 'flex-end'}}><Text style={{fontSize: 16}}>{item.lowestAddressLevel.title}</Text></Row>
                                          <Row
                                              style={{justifyContent: 'flex-end'}}>{item.enrolments.map((enrolment, index) => this.renderProgram(enrolment.program, index))}</Row>
                                      </Col>
                                  </Grid>
                              </ListItem>
                          }>
                    </List>
                </Content>
                {this.renderZeroResultsMessageIfNeeded()}
            </Container>
        );
    }

    onResultRowPress(individual) {
        TypedTransition.from(this).with({individual: individual}).to(IndividualEncounterView);
    }
}

export default IndividualSearchResultsView;