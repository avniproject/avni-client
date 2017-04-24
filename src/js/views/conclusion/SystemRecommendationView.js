import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {View} from "react-native";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import IndividualProfile from "../common/IndividualProfile";
import {Container, Content, Text} from "native-base";
import TypedTransition from "../../framework/routing/TypedTransition";
import WizardButtons from "../common/WizardButtons";
import AppHeader from "../common/AppHeader";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Distances from "../primitives/Distances";
import Observations from "../common/Observations";

@Path('/SystemRecommendationView')
class SystemRecommendationView extends AbstractComponent {
    static propTypes = {
        individual: React.PropTypes.object.isRequired,
        saveActionName: React.PropTypes.string.isRequired,
        onSaveCallback: React.PropTypes.func.isRequired,
        decisions: React.PropTypes.array.isRequired,
        observations: React.PropTypes.array.isRequired,
        validationErrors: React.PropTypes.array.isRequired,
        headerMessage: React.PropTypes.string
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
            cb: () => this.props.onSaveCallback(this),
            error: (message) => this.showError(message)
        });
    }

    previous() {
        TypedTransition.from(this).goBack();
    }

    render() {
        this.log(`render`);
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.props.headerMessage}/>
                    <View style={{flexDirection: 'column'}}>
                        <IndividualProfile viewContext={IndividualProfile.viewContext.Wizard} individual={this.props.individual} style={{
                            backgroundColor: Colors.GreyContentBackground,
                            paddingHorizontal: 24,
                            paddingBottom: 12,
                        }}/>
                        <View style={this.scaleStyle({paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'column'})}>
                            {
                                this.props.validationErrors.map((validationResult, index) => {
                                    return <View style={this.scaleStyle(SystemRecommendationView.styles.rulesRowView)}
                                                 key={`error${index}`}>
                                        <Text style={{fontSize: Fonts.Medium, color: Colors.ValidationError}}>{this.I18n.t(validationResult.messageKey)}</Text>
                                    </View>;
                                })
                            }
                            {
                                _.values(this.props.decisions).map((decision, index) => {
                                    return <View style={SystemRecommendationView.styles.rulesRowView}
                                                 key={`decision${index}`}>
                                        <Text style={{fontSize: Fonts.Medium}}>{decision.value}</Text>
                                    </View>
                                })}
                        </View>
                        <Observations observations={this.props.observations} style={{marginHorizontal: Distances.ContentDistanceFromEdge}}/>
                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{func: () => this.save(), visible: this.props.validationErrors.length === 0, label: this.I18n.t('save')}}
                                       style={{marginHorizontal: 24}}/>
                    </View>
                </Content>
            </Container>
        );
    }
}

export default SystemRecommendationView;

