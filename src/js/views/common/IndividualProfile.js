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

class IndividualProfile extends AbstractComponent {
    static propTypes = {
        landingView: React.PropTypes.bool.isRequired,
        individual: React.PropTypes.object.isRequired
    };

    static buttonIconStyle = {fontSize: 14, color: '#009688'};
    static buttonTextStyle = {fontSize: 14, color: '#009688'};

    constructor(props, context) {
        super(props, context, "individualProfile");
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
                        visible={this.state.enrolment.enrolling}
                        onRequestClose={() => {
                        }}>
                        <Container theme={themes}>
                            <Content contentContainerStyle={{marginTop: 100}}>
                                <Grid>
                                    <Row style={{backgroundColor: '#fff'}}>
                                        <RadioGroup action={Actions.PROGRAM_SELECTION}
                                                    selectionFn={(program) => _.isNil(this.state.enrolment.selectedProgram) ? false : this.state.enrolment.selectedProgram.uuid === program.uuid}
                                                    labelKey="selectProgram"
                                                    labelValuePairs={this.state.enrolment.programs.map((program) => new RadioLabelValue(program.name, program))}/>
                                    </Row>
                                    <Row style={{backgroundColor: '#fff'}}>
                                        <Button onPress={() => this.enrolInProgram()}>{this.I18n.t('enrol')}</Button>
                                        <Button onPress={() => this.dispatchAction(Actions.DONOT_CHOOSE_PROGRAM)}>{this.I18n.t('cancel')}</Button>
                                    </Row>
                                </Grid>
                            </Content>
                        </Container>
                    </Modal>

                    <Grid style={{backgroundColor: '#212121'}}>
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
                                | {this.props.individual.lowestAddressLevel.title}
                            </Text>
                        </Row>
                        <Row style={DGS.generalHistory.buttonRowStyle}>
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle}>
                                <Icon name="mode-edit" style={IndividualProfile.buttonIconStyle} />{this.I18n.t('editProfile')}</Button>
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle} onPress={() => this.enrol()}>
                                <Icon name="add" style={IndividualProfile.buttonIconStyle}/>{this.I18n.t('enrol')}</Button>
                        </Row>
                        <Row style={DGS.generalHistory.buttonRowStyle}>
                            <Button bordered style={DGS.generalHistory.buttonStyle} textStyle={IndividualProfile.buttonTextStyle} onPress={() => this.viewGeneralHistory()}>
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
                            style={{fontSize: 16}}>{this.props.individual.lowestAddressLevel.title}</Text></Col>
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
            ).to(IndividualGeneralHistoryView)})
    }

    enrol() {
        this.dispatchAction(Actions.NEW_ENROLMENT);
    }

    enrolInProgram() {
        this.dispatchAction(Actions.CHOOSE_PROGRAM, {
            cb: () => TypedTransition.from(this).with(
                {individual: this.props.individual, program: this.state.enrolment.selectedProgram}
                ).to(ProgramEnrolmentView)})
    }
}

export default IndividualProfile;