import {View, Text} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Button, Col, Content, Grid, Icon, Row} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import {Actions} from "../../action/individual/IndividualProfileActions";
import DGS from "../primitives/DynamicGlobalStyles";
import IndividualGeneralHistoryView from "../individual/IndividualGeneralHistoryView";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import EntityTypeSelector from "./EntityTypeSelector";

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        viewContext: React.PropTypes.string.isRequired
    };

    static buttonIconStyle = {fontSize: 14, color: Colors.ActionButtonColor, marginBottom: 4};
    static buttonTextStyle = {fontSize: 14, color: Colors.ActionButtonColor};

    static viewContext = {
        Program: 'Program',
        General: 'General',
        Wizard: 'Wizard',
        Individual: 'Individual'
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualProfile);
    }

    componentWillMount() {
        this.dispatchAction(Actions.INDIVIDUAL_SELECTED, {value: this.props.individual});
        return super.componentWillMount();
    }

    getImage(individual) {
        return ;
    }

    renderProfileActionButton(iconMode, displayTextMessageKey, onPress) {
        return <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle} onPress={onPress}>
            <Icon name={iconMode} style={IndividualProfile.buttonIconStyle}/>{this.I18n.t(displayTextMessageKey)}</Button>
    }

    viewProfile() {
        CHSNavigator.navigateToIndividualRegistrationDetails(this, this.props.individual);
    }

    editProfile() {
        CHSNavigator.navigateToIndividualRegisterView(this, this.props.individual.uuid);
    }

    render() {
        console.log('IndividualProfile.render');
        return this.props.viewContext !== IndividualProfile.viewContext.Wizard ?
            (
                <Content>
                    <EntityTypeSelector entityTypes={this.state.entityTypes} flowState={this.state.flowState} selectedEntityType={this.state.entity.program}
                                        actions={Actions} labelKey='selectProgram'
                                        onEntityTypeSelectionConfirmed={(newState) => CHSNavigator.navigateToProgramEnrolmentView(this, newState.entity)}/>
                    <View style={{backgroundColor: Colors.BlackBackground, flexDirection: 'column'}}>
                        <View style={{justifyContent: 'center', flexDirection: 'row'}}>
                            <Icon name='person-pin' style={{color: Colors.ActionButtonColor, opacity: 0.8, justifyContent: 'center', fontSize: 68}}/>
                        </View>
                        <View style={{justifyContent: 'center', flexDirection: 'row'}}><Text
                            style={{fontSize: 16, color: '#fff', justifyContent: 'center'}}>{this.props.individual.name} {this.props.individual.id}</Text></View>
                        <View style={{justifyContent: 'center', marginBottom: DGS.resizeHeight(14), flexDirection: 'row'}}>
                            <Text style={{
                                textAlignVertical: 'top',
                                fontSize: 14,
                                color: '#fff',
                                justifyContent: 'center'
                            }}>{this.I18n.t(this.props.individual.gender.name)}, {this.props.individual.getAge().toString(this.I18n)}, {this.props.individual.lowestAddressLevel.name}
                            </Text>
                        </View>
                        <View style={[DGS.generalHistory.buttonRowStyle, {flexDirection: 'row', alignItems: 'center'}]}>
                            {this.props.viewContext === IndividualProfile.viewContext.Individual ?
                                this.renderProfileActionButton('mode-edit', 'editProfile', () => {
                                    this.editProfile()
                                }) :
                                this.renderProfileActionButton('person', 'viewProfile', () => {
                                    this.viewProfile()
                                })
                            }
                            {this.renderProfileActionButton('add', 'enrolInProgram', () => this.launchChooseProgram())}
                        </View>
                        <View style={[DGS.generalHistory.buttonRowStyle, {flexDirection: 'row', marginBottom: DGS.resizeHeight(43)}]}>
                            {this.renderProfileActionButton('mode-edit', 'generalHistory', () => this.viewGeneralHistory())}
                            {this.props.individual.hasEnrolments && this.props.viewContext !== IndividualProfile.viewContext.Program ? this.renderProfileActionButton('view-module', 'enrolments', () => this.viewEnrolments()) :
                                <View/>}
                        </View>
                    </View>
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
        TypedTransition.from(this).with({individualUUID: this.props.individual.uuid}).to(IndividualGeneralHistoryView);
    }
}

export default IndividualProfile;