import React from "react";
import {Alert, StyleSheet, Text, TouchableNativeFeedback, View} from 'react-native';
import AbstractComponent from "../../src/framework/view/AbstractComponent";
import Path from "../../src/framework/routing/Path";
import Reducers from '../../src/reducer';
import General from "../utility/General";
import Actions from "../action/beneficiarymode/BeneficiaryIdentificationActions";
import CHSContent from "./common/CHSContent";
import AppHeader from "./common/AppHeader";
import CHSNavigator from "../utility/CHSNavigator";
import Distances from "./primitives/Distances";
import FormElementGroup from "./form/FormElementGroup";
import WizardButtons from "./common/WizardButtons";
import CHSContainer from "./common/CHSContainer";
import {ObservationsHolder, Point, ProgramEnrolment, StaticFormElementGroup} from "openchs-models";

@Path('/BeneficiaryIdentificationPage')
class BeneficiaryIdentificationPage extends AbstractComponent {
    static propTypes = {
        // params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.beneficiaryIdentification);
    }

    viewName() {
        return "BeneficiaryIdentificationPage";
    }

    componentWillMount() {
        this.dispatchAction(Actions.onLoad);
        super.componentWillMount();
    }

    submit() {
        this.dispatchAction(Actions.findIndividual, {
            cb: beneficiary => {
                if (beneficiary) {
                    CHSNavigator.navigateToBeneficiaryDashboard(this, {beneficiary});
                } else {
                    Alert.alert(this.I18n.t("beneficiaryNotFound"),
                        this.I18n.t("beneficiaryNotFoundMessage"));
                }
            },
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return <CHSContainer>
            <CHSContent ref="scroll">
                <AppHeader title={'BeneficiaryIdentification'} hideBackButton={true}/>
                <View style={{flexDirection: 'column', paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                    <FormElementGroup
                        observationHolder={new ObservationsHolder(this.state.observations)}
                        group={this.state.formElementGroup}
                        actions={Actions.Names}
                        validationResults={null}
                        filteredFormElements={null}
                        formElementsUserState={null}
                        dataEntryDate={null}
                    />
                    <WizardButtons next={{
                        func: () => this.submit(), label: this.I18n.t('View')
                    }}/>
                </View>
            </CHSContent>
        </CHSContainer>;
    }
}

export default BeneficiaryIdentificationPage;
