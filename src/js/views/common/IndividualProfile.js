import {View, StyleSheet, Modal} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, Button, Grid, Row, Col, Icon, Thumbnail, Content, Container} from "native-base";
import moment from "moment";
import TypedTransition from "../../framework/routing/TypedTransition";
import ProgramEnrolmentView from "../program/ProgramEnrolmentView";
import {Actions} from "../../action/individual/IndividualProfileActions";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import themes from "../primitives/themes";
import DGS from "../primitives/DynamicGlobalStyles";
import IndividualGeneralHistoryView from "../individual/IndividualGeneralHistoryView";
import {IndividualProfileActions as IPA} from "../../action/individual/IndividualProfileActions";
import ReducerKeys from "../../reducer";
import _ from 'lodash';
import Colors from '../primitives/Colors';

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        landingView: React.PropTypes.bool.isRequired,
        individual: React.PropTypes.object.isRequired
    };

    static buttonIconStyle = {fontSize: 14, color: Colors.ActionButtonColor};
    static buttonTextStyle = {fontSize: 14, color: Colors.ActionButtonColor};

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

    render() {
        return this.props.landingView ?
            (
                <Content>
                    <Modal
                        animationType={"slide"}
                        transparent={true}
                        visible={[IPA.enrolFlow.LaunchedEnrol, IPA.enrolFlow.ProgramSelected].includes(this.state.enrolFlowState)}
                        onRequestClose={() => {
                        }}>
                        <Container theme={themes}>
                            <Content contentContainerStyle={{marginTop: 100}}>
                                <Grid>
                                    <Row style={{backgroundColor: '#fff'}}>
                                        <RadioGroup action={Actions.SELECTED_PROGRAM}
                                                    selectionFn={(program) => _.isNil(this.state.enrolment.program) ? false : this.state.enrolment.program.uuid === program.uuid}
                                                    labelKey="selectProgram"
                                                    labelValuePairs={this.state.programs.map((program) => new RadioLabelValue(program.name, program))}/>
                                    </Row>
                                    <Row style={{backgroundColor: '#fff'}}>
                                        <Button onPress={() => this.programSelectionConfirmed()}>{this.I18n.t('enrolInProgram')}</Button>
                                        <Button onPress={() => this.dispatchAction(Actions.CANCELLED_PROGRAM_SELECTION)}>{this.I18n.t('cancel')}</Button>
                                    </Row>
                                </Grid>
                            </Content>
                        </Container>
                    </Modal>

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
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle}>
                                <Icon name="mode-edit" style={IndividualProfile.buttonIconStyle}/>{this.I18n.t('editProfile')}</Button>
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle} onPress={() => this.launchChooseProgram()}>
                                <Icon name="add" style={IndividualProfile.buttonIconStyle}/>{this.I18n.t('enrolInProgram')}</Button>
                        </Row>
                        <Row style={DGS.generalHistory.buttonRowStyle}>
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle}
                                    onPress={() => this.viewGeneralHistory()}>
                                <Icon name="mode-edit" style={IndividualProfile.buttonIconStyle}/>{this.I18n.t('generalHistory')}</Button>
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

    viewGeneralHistory() {
        this.dispatchAction(Actions.VIEW_GENERAL_HISTORY, {
            cb: () => TypedTransition.from(this).with(
                {individual: this.props.individual}
            ).to(IndividualGeneralHistoryView)
        })
    }

    launchChooseProgram() {
        this.dispatchAction(Actions.LAUNCH_CHOOSE_PROGRAM);
    }

    programSelectionConfirmed() {
        this.dispatchAction(Actions.PROGRAM_SELECTION_CONFIRMED, {
            cb: (newState) => TypedTransition.from(this).with(
                {individual: this.props.individual, enrolment: newState.enrolment}
            ).to(ProgramEnrolmentView)
        })
    }
}

export default IndividualProfile;