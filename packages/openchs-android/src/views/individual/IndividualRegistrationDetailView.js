import {View, Alert, Text, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Observations from "../common/Observations";
import {Card} from "native-base";
import {IndividualRegistrationDetailsActionsNames as Actions} from "../../action/individual/IndividualRegistrationDetailsActions";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
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
                (source) => TypedTransition.from(source).resetStack([IndividualAddRelativeView], IndividualRegistrationDetailView, {individualUUID: this.state.individual.uuid})
            )
        })];
    }

    goBackFromRelative(individual) {
        CHSNavigator.goBack(this);
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: individual.uuid});

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


    renderRelatives() {
        const individualToComeBackTo = this.state.individual;
        return (
            <View style={{marginTop: 20}}>
                <View style={{paddingLeft: 10}}>
                    <ObservationsSectionTitle contextActions={this.getRelativeActions()}
                                              title={'Relatives'}/>
                </View>
                <Relatives relatives={this.state.relatives}
                           style={{marginVertical: DGS.resizeHeight(8)}}
                           onRelativeSelection={(source, individual) => CHSNavigator.navigateToIndividualRegistrationDetails(source, individual, () => this.goBackFromRelative(individualToComeBackTo))}
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

    renderProfile() {
        return <View>
            <Text
                style={[Fonts.Title, {color: Colors.DefaultPrimaryColor}]}>{this.I18n.t("registrationInformation")}</Text>
            <Observations observations={this.state.individual.observations}
                          style={{marginVertical: 3}}/>
            <ObservationsSectionOptions
                contextActions={[new ContextAction('edit', () => this.editProfile())]}/>
        </View>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const relativesFeatureToggle = this.state.individual.isIndividual();
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Colors.GreyContentBackground}}>
                    <View style={{backgroundColor: Styles.defaultBackground}}>
                        <AppHeader title={this.I18n.t('viewProfile')} func={this.props.params.backFunction}/>
                        <IndividualProfile individual={this.state.individual}
                                           viewContext={IndividualProfile.viewContext.Individual}
                                           programsAvailable={this.state.programsAvailable}/>
                    </View>
                    <View style={{marginHorizontal: 10, marginTop: 10}}>
                        <View style={styles.container}>
                            {this.state.individual.voided ? this.renderVoided() : this.renderProfile()}
                        </View>
                        {relativesFeatureToggle ? this.renderRelatives() : <View/>}
                    </View>
                    <Separator height={50} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>
            </CHSContainer>
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
