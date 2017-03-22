import {View, StyleSheet, Modal} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Button, Grid, Row, Col, Icon, Thumbnail, Content} from "native-base";
import moment from "moment";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Actions} from "../../action/individual/IndividualProfileActions";
import DGS from "../primitives/DynamicGlobalStyles";
import IndividualGeneralHistoryView from "../individual/IndividualGeneralHistoryView";
import ReducerKeys from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import EntityTypeSelector from "./EntityTypeSelector";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        viewContext: React.PropTypes.string.isRequired
    };

    static buttonIconStyle = {fontSize: 14, color: Colors.ActionButtonColor};
    static buttonTextStyle = {fontSize: 14, color: Colors.ActionButtonColor};

    static viewContext = {
        Program: 'Program',
        General: 'General',
        Wizard: 'Wizard'
    };

    constructor(props, context) {
        super(props, context, ReducerKeys.individualProfile);
    }

    componentWillMount() {
        this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {value: this.props.individual});
        return super.componentWillMount();
    }

    getImage(individual) {
        if (individual.gender.name === 'Male') {
            if (moment().diff(individual.dateOfBirth, 'years') > 30) {
                return <Thumbnail size={DGS.resizeHeight(75)} style={{borderWidth: 2, borderColor: '#ffffff', margin: DGS.resizeHeight(28)}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/narendra_modi.png")}/>
            }
            else {
                return <Thumbnail size={DGS.resizeHeight(75)} style={{borderWidth: 2, borderColor: '#ffffff', margin: DGS.resizeHeight(28)}}
                                  source={require("../../../../android/app/src/main/res/mipmap-mdpi/arvind_kejriwal.jpg")}/>
            }
        }
        else if (individual.gender.name === 'Female') {
            return <Thumbnail size={DGS.resizeHeight(75)} style={{borderWidth: 2, borderColor: '#ffffff', margin: DGS.resizeHeight(28)}}
                              source={require("../../../../android/app/src/main/res/mipmap-mdpi/mamta.jpg")}/>
        }
    }

    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle} onPress={onPress}>
            <Icon name={iconMode} style={IndividualProfile.buttonIconStyle}/>{this.I18n.t(displayTextMessageKey)}</Button>
    }

    render() {
        return this.props.viewContext !== IndividualProfile.viewContext.Wizard ?
            (
                <Content>
                    <EntityTypeSelector entityTypes={this.state.entityTypes} flowState={this.state.flowState} selectedEntityType={this.state.entity.program}
                                        actions={Actions} labelKey='selectProgram' confirmActionLabelKey='enrolInProgram'/>
                    <Grid style={{backgroundColor: Colors.Blackish}}>
                        <Row style={{justifyContent: 'center', height: DGS.resizeHeight(131)}}>
                            {this.getImage(this.props.individual)}
                        </Row>
                        <Row style={{justifyContent: 'center', height: DGS.resizeHeight(30)}}><Text
                            style={{fontSize: 16, color: '#fff', justifyContent: 'center'}}>{this.props.individual.name}
                            | {this.props.individual.id}</Text></Row>
                        <Row style={{justifyContent: 'center', height: DGS.resizeHeight(30), marginBottom: DGS.resizeHeight(14)}}>
                            <Text style={{
                                textAlignVertical: 'top',
                                fontSize: 14,
                                color: '#fff',
                                justifyContent: 'center'
                            }}>{this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getAge().toString(this.I18n)}
                                | {this.props.individual.lowestAddressLevel.name}
                            </Text>
                        </Row>
                        <Row style={DGS.generalHistory.buttonRowStyle}>
                            {this.renderProfileActionButton('mode-edit', 'editProfile', () => {
                            })}
                            {this.renderProfileActionButton('add', 'enrolInProgram', () => this.launchChooseProgram())}
                        </Row>
                        <Row style={DGS.generalHistory.buttonRowStyle}>
                            {this.renderProfileActionButton('mode-edit', 'generalHistory', () => this.viewGeneralHistory())}
                            {this.props.individual.hasEnrolments && this.props.viewContext !== IndividualProfile.viewContext.Program ? this.renderProfileActionButton('view-module', 'enrolments', () => this.viewEnrolments()) :
                                <View/>}
                        </Row>
                    </Grid>
                </Content>
            ) :
            (
                <Grid>
                    <Row style={{height: 24}}>
                        <Col><Text
                            style={{fontSize: 16}}>{this.props.individual.name}</Text></Col>
                        <Col style={{width: 100}}><Text
                            style={{fontSize: 16}}>{this.props.individual.lowestAddressLevel.name}</Text></Col>
                    </Row>
                    <Row style={{height: 24}}>
                        <Col><Text style={{fontSize: 14}}>
                            {this.I18n.t(this.props.individual.gender.name)} | {this.props.individual.getAge().toString(this.I18n)}</Text></Col>
                        <Col style={{width: 100}}></Col>
                    </Row>
                </Grid>
            );
    }

    viewEnrolments() {
        CHSNavigator.navigateToProgramEnrolmentDashboardView(this, this.props.individual.uuid);
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    viewGeneralHistory() {
        this.dispatchAction(Actions.VIEW_GENERAL_HISTORY, {
            cb: () => TypedTransition.from(this).with(
                {individual: this.props.individual}
            ).to(IndividualGeneralHistoryView)
        })
    }
}

export default IndividualProfile;