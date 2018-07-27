import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import IndividualProfile from "../common/IndividualProfile";
import FamilyProfile from "../familyfolder/FamilyProfile";
import {Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import WizardButtons from "../common/WizardButtons";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";
import Observations from "../common/Observations";
import General from "../../utility/General";
import ConceptService from "../../service/ConceptService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import {Individual} from "openchs-models";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        saveActionName: React.PropTypes.string.isRequired,
        onSaveCallback: React.PropTypes.func.isRequired,
        decisions: React.PropTypes.object,
        observations: React.PropTypes.array.isRequired,
        validationErrors: React.PropTypes.array.isRequired,
        headerMessage: React.PropTypes.string,
        checklists: React.PropTypes.array,
        nextScheduledVisits: React.PropTypes.array,
        form: React.PropTypes.object
    };

    static styles = {
        rulesRowView: {backgroundColor: Colors.GreyContentBackground, paddingBottom: 19, paddingLeft: 10}
    };

    viewName() {
        return 'SystemRecommendationView';
    }

    constructor(props, context) {
        super(props, context);
    }

    save() {
        this.dispatchAction(this.props.saveActionName, {
            decisions: this.props.decisions,
            checklists: this.props.checklists,
            nextScheduledVisits: this.props.nextScheduledVisits,
            cb: () => this.props.onSaveCallback(this),
            error: (message) => this.showError(message)
        });
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    profile() {
        return (this.props.individual instanceof Individual) ?
            <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard}
                               individual={this.props.individual} style={{
                backgroundColor: Colors.GreyContentBackground,
                paddingHorizontal: 24,
                paddingBottom: 12
            }}/> :
            <FamilyProfile viewContext={FamilyProfile.viewContext.Wizard}
                           family={this.props.individual} style={{
                backgroundColor: Colors.GreyContentBackground,
                paddingHorizontal: 24,
                paddingBottom: 12
            }}/>


    }

    render() {
        General.logDebug(this.viewName(), `render`);
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.props.headerMessage}/>
                    <View style={{flexDirection: 'column'}}>
                        {this.profile()}
                        <View style={{flexDirection: 'column', marginHorizontal: Distances.ContentDistanceFromEdge}}>
                            <View style={this.scaleStyle({paddingVertical: 12, flexDirection: 'column'})}>
                                {
                                    this.props.validationErrors.map((validationResult, index) => {
                                        return (
                                            <View style={this.scaleStyle(SystemRecommendationView.styles.rulesRowView)}
                                                  key={`error${index}`}>
                                                <Text style={{
                                                    fontSize: Fonts.Medium,
                                                    color: Colors.ValidationError
                                                }}>{this.I18n.t(validationResult.messageKey)}</Text>
                                            </View>
                                        );
                                    })
                                }
                                <Observations highlight
                                              observations={this.context.getService(ConceptService).getObservationsFromDecisions(this.props.decisions)}
                                              title={this.I18n.t('systemRecommendations')}/>
                            </View>
                            <Observations observations={this.props.observations} form={this.props.form}
                                          title={this.I18n.t('observations')}/>
                            <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                           next={{
                                               func: () => this.save(),
                                               visible: this.props.validationErrors.length === 0,
                                               label: this.I18n.t('save')
                                           }}
                                           style={{marginHorizontal: 24}}/>

                        </View>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SystemRecommendationView;

