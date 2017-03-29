import AbstractComponent from "../../framework/view/AbstractComponent";
import {View} from "react-native";
import React from "react";
import Path from "../../framework/routing/Path";
import GlobalStyles from "../primitives/GlobalStyles";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualEncounterLandingView from "./IndividualEncounterLandingView";
import {Container, Content, List, ListItem, Thumbnail, Grid, Row, Col, Text, Button} from "native-base";
import moment from "moment";
import themes from "../primitives/themes";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AppHeader from "../common/AppHeader";
import Fonts from "../primitives/Fonts";
import ProgramEnrolmentDashboardView from "../program/ProgramEnrolmentDashboardView";
import Colors from "../primitives/Colors";
import CHSNavigator from '../../utility/CHSNavigator';

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
            <Button key={index} disabled style={{marginLeft: 8, width: 74, height: 22, backgroundColor: colour}}>{program.name}</Button>
        );
    }

    getImage(individual) {
        if (individual.gender.name === 'Male') {
            if (moment().diff(individual.dateOfBirth, 'years') > 30) {
                return <Thumbnail size={DynamicGlobalStyles.resizeWidth(68)} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/narendra_modi.png")}/>
            }
            else {
                return <Thumbnail size={DynamicGlobalStyles.resizeWidth(68)} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/arvind_kejriwal.jpg")}/>
            }
        }
        else if (individual.gender.name === 'Female') {
            return <Thumbnail size={DynamicGlobalStyles.resizeWidth(68)} style={{borderWidth: 2, borderColor: '#4a4a4a'}}
                              source={require("../../../../android/app/src/main/res/mipmap-mdpi/mamta.jpg")}/>
        }
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t("searchResults")}/>
                    <List dataArray={this.props.params.searchResults}
                          renderRow={(item) =>
                              <ListItem key={item.uuid}
                                        style={{backgroundColor: Colors.GreyContentBackground, marginLeft: 0, paddingLeft: DynamicGlobalStyles.resizeWidth(17), padding: DynamicGlobalStyles.resizeWidth(17), height: DynamicGlobalStyles.resizeHeight(102)}}
                                        onPress={() => this.onResultRowPress(item)}>
                                  <Grid>
                                      <Col style={{width: DynamicGlobalStyles.resizeWidth(68)}}>
                                          {this.getImage(item)}
                                      </Col>
                                      <Col style={{paddingLeft: DynamicGlobalStyles.resizeWidth(16)}}>
                                          <Row><Text style={{fontSize: 16}}>{item.name}</Text></Row>
                                          <Row>
                                              <Text style={{fontSize: Fonts.Normal}} note>{item.gender.name}</Text>
                                              <Text style={{paddingLeft: DynamicGlobalStyles.resizeWidth(8), paddingRight: DynamicGlobalStyles.resizeWidth(8)}}>|</Text>
                                              <Text style={{fontSize: Fonts.Normal}} note>{item.getAge().toString()}</Text>
                                          </Row>
                                      </Col>
                                      <Col style={{width: DynamicGlobalStyles.resizeWidth(246)}}>
                                          <Row style={{justifyContent: 'flex-end'}}><Text style={{fontSize: 16}}>{item.lowestAddressLevel.name}</Text></Row>
                                          <Row style={{justifyContent: 'flex-end'}}><Text style={{fontSize: 16}}>{item.catchmentId}</Text></Row>
                                          <Row
                                              style={{justifyContent: 'flex-end'}}>{_.filter(item.enrolments, (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}</Row>
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
        if (individual.hasActiveEnrolment)
            CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
        else
            CHSNavigator.navigateToIndividualEncounterLandingView(this, individual.uuid);
    }
}

export default IndividualSearchResultsView;