import {Alert, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Observations from "../common/Observations";
import {Card} from "native-base";
import {IndividualRegistrationDetailsActionsNames as Actions} from "../../action/individual/IndividualRegistrationDetailsActions";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import Fonts from "../primitives/Fonts";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Relatives from "../common/Relatives";
import ContextAction from "../viewmodel/ContextAction";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualAddRelativeView from "../individual/IndividualAddRelativeView";
import Colors from "../primitives/Colors";
import {WorkItem, WorkList, WorkLists} from "openchs-models";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import Separator from "../primitives/Separator";
import Distances from "../primitives/Distances";
import ProgramEnrolmentTabView from "../program/ProgramEnrolmentTabView";
import {ProgramEnrolmentTabActionsNames as TabActions} from "../../action/program/ProgramEnrolmentTabActions";
import Icon from 'react-native-vector-icons/SimpleLineIcons';

@Path('/IndividualRegistrationDetailView')
class IndividualRegistrationDetailView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    viewName() {
        return 'IndividualRegistrationDetailView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegistrationDetails);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    getRelativeActions() {
        return [new ContextAction(this.I18n.t('addRelative'), () => {
            CHSNavigator.navigateToAddRelativeView(this, this.state.individual,
                (source) => TypedTransition.from(source)
                    .resetStack([IndividualAddRelativeView], [
                        TypedTransition.createRoute(ProgramEnrolmentTabView, {individualUUID: this.state.individual.uuid, tab: 1})
                    ])
            )
        })];
    }

    onRelativeDeletePress(individualRelative) {
        Alert.alert(
            this.I18n.t('deleteRelativeNoticeTitle'),
            this.I18n.t('deleteRelativeConfirmationMessage', {
                individualA: individualRelative.individual.name,
                individualB: individualRelative.relative.name
            }),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        this.dispatchAction(Actions.ON_DELETE_RELATIVE, {individualRelative: individualRelative})
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    },
                    style: 'cancel'
                }
            ]
        )

    }

    editProfile() {
        CHSNavigator.navigateToRegisterView(this, new WorkLists(
            new WorkList(`${this.state.individual.subjectType.name} `,
                [new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION,
                    {
                        uuid: this.state.individual.uuid,
                        subjectTypeName: this.state.individual.subjectType.name
                    })])));
    }

    onRelativeSelection(individualUUID) {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID});
        this.dispatchAction(TabActions.ON_LOAD, {individualUUID, messageDisplayed: false, tab: 1});
    }

    renderRelatives() {
        const individualToComeBackTo = this.state.individual;
        return (
            <View style={{marginTop: 20}}>
                <View style={{paddingLeft: 10}}>
                    <ObservationsSectionTitle contextActions={this.getRelativeActions()}
                                              title={'Relatives'}
                                              titleStyle={Styles.cardTitle}/>
                </View>
                <Relatives relatives={this.state.relatives}
                           style={{marginVertical: DGS.resizeHeight(8)}}
                           onRelativeSelection={(source, individual) => this.onRelativeSelection(individual.uuid)}
                           onRelativeDeletion={this.onRelativeDeletePress.bind(this)}/>
            </View>
        );
    }

    renderVoided() {
        return (
            <Text style={{fontSize: Fonts.Large, color: Styles.redColor}}>
                {this.I18n.t("thisIndividualHasBeenVoided")}
            </Text>
        );
    }

    voidIndividual() {
        Alert.alert(
            this.I18n.t('voidIndividualConfirmationTitle'),
            this.I18n.t('voidIndividualConfirmationMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        this.dispatchAction(Actions.VOID_INDIVIDUAL,
                            {
                                individualUUID: this.props.params.individualUUID,
                                cb: () => {
                                }
                            },
                        );
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    },
                    style: 'cancel'
                }
            ]
        )
    }

    renderProfile() {
        return <View>
            <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_TOGGLE)}>
                <View styel={{flexDirection: 'column'}}>
                    <Text style={[Styles.cardTitle, {color: Colors.DefaultPrimaryColor}]}>
                        {this.I18n.t("registrationInformation")}
                    </Text>
                    <Text style={{fontSize: Fonts.Medium, color: Colors.DefaultPrimaryColor}}>
                        {`${this.I18n.t("registeredOn")}${General.toDisplayDate(this.state.individual.registrationDate)}`}
                    </Text>
                </View>
                <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {this.state.expand === false ?
                        <Icon name={'arrow-down'} size={12}/> :
                        <Icon name={'arrow-up'} size={12}/>}
                </View>
            </TouchableOpacity>
            <View style={{marginTop: 3}}>
                {this.state.expand === true ?
                    <View style={{paddingHorizontal: 10}}>
                        <Observations observations={this.state.individual.observations}
                                      style={{marginVertical: 3}}/>
                    </View> : <View/>}
                <TouchableOpacity onPress={() => this.dispatchAction(Actions.ON_TOGGLE)}>
                    <ObservationsSectionOptions
                        contextActions={[new ContextAction('void', () => this.voidIndividual(), Colors.CancelledVisitColor), new ContextAction('edit', () => this.editProfile())]}/>
                </TouchableOpacity>
            </View>
        </View>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const relativesFeatureToggle = this.state.individual.isIndividual();
        return (
            <View style={{backgroundColor: Colors.GreyContentBackground}}>
                <View style={{backgroundColor: Styles.defaultBackground}}>
                </View>
                <View style={{marginHorizontal: 10, marginTop: 10}}>
                    <View style={styles.container}>
                        {this.state.individual.voided ? this.renderVoided() : this.renderProfile()}
                    </View>
                    {relativesFeatureToggle ? this.renderRelatives() : <View/>}
                </View>
                <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
            </View>
        );
    }
}

export default IndividualRegistrationDetailView;


const styles = StyleSheet.create({
    container: {
        padding: Distances.ScaledContentDistanceFromEdge,
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 3
    }
});
