import AbstractComponent from "../../framework/view/AbstractComponent";
import {View} from "react-native";
import React from "react";
import Path from "../../framework/routing/Path";
import GlobalStyles from "../primitives/GlobalStyles";
import {Container, Content, List, ListItem, Grid, Row, Col, Text, Button, Icon} from "native-base";
import themes from "../primitives/themes";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AppHeader from "../common/AppHeader";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";

@Path('/individualSearchResults')
class IndividualSearchResultsView extends AbstractComponent {
    static propTypes = {
        searchResults: React.PropTypes.array.isRequired
    };

    viewName() {
        return 'IndividualSearchResultsView';
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
        if (this.props.searchResults.length === 0)
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
        return (
            <Button key={index} disabled
                    style={{marginLeft: 8, width: 74, height: 22, backgroundColor: program.colour}}>{program.name}</Button>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.I18n.t("searchResults")}/>
                    <List style={{backgroundColor: Colors.GreyContentBackground}} dataArray={this.props.searchResults}
                          renderRow={(item) =>
                              <ListItem key={item.uuid}
                                        style={this.scaleStyle({
                                            padding: 17,
                                        })}
                                        onPress={() => this.onResultRowPress(item)}>
                                  <Grid>
                                      <Col style={{width: DynamicGlobalStyles.resizeWidth(68)}}>
                                          <Icon name='person-pin' style={{color: Colors.ActionButtonColor, opacity: 0.8, justifyContent: 'center', fontSize: 48}}/>
                                      </Col>
                                      <Col style={{paddingLeft: DynamicGlobalStyles.resizeWidth(16)}}>
                                          <Row><Text style={{fontSize: Fonts.Large}}>{item.name}</Text></Row>
                                          <Row>
                                              <Text style={{fontSize: Fonts.Normal}} note>{item.gender.name}</Text>
                                              <Text style={this.scaleStyle({paddingLeft: 8, paddingRight: 8})}>|</Text>
                                              <Text style={{fontSize: Fonts.Normal}} note>{item.getAge().toString()}</Text>
                                          </Row>
                                      </Col>
                                      <Col style={{width: DynamicGlobalStyles.resizeWidth(246)}}>
                                          <Row style={{justifyContent: 'flex-end'}}><Text style={{fontSize: Fonts.Large}}>{item.lowestAddressLevel.name}</Text></Row>
                                          <Row
                                              style={{justifyContent: 'flex-end'}}>{_.filter(item.enrolments, (enrolment) => enrolment.isActive).map((enrolment, index) => this.renderProgram(enrolment.program, index))}</Row>
                                      </Col>
                                  </Grid>
                              </ListItem>
                          }>
                    </List>
                    {this.renderZeroResultsMessageIfNeeded()}
                </Content>
            </Container>
        );
    }

    onResultRowPress(individual) {
        CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
    }
}

export default IndividualSearchResultsView;