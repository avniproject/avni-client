import {Alert, ScrollView} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {Actions} from "../../action/individual/PersonAddRelativeActions";
import General from "../../utility/General";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import IndividualFormElement from "../form/formElement/IndividualFormElement";
import StaticFormElement from "../viewmodel/StaticFormElement";
import {IndividualRelative} from 'avni-models';
import _ from "lodash";
import RadioLabelValue from "../primitives/RadioLabelValue";
import AppHeader from "../common/AppHeader";
import WizardButtons from "../common/WizardButtons";
import CHSContainer from "../common/CHSContainer";
import CHSNavigator from "../../utility/CHSNavigator";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";

@Path('/individualAddRelative')
class IndividualAddRelativeView extends AbstractComponent {
    static propTypes = {
        individual: PropTypes.object
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualAddRelative);
    }

    viewName() {
        return 'IndividualAddRelativeView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        return super.UNSAFE_componentWillMount();
    }

    previous() {
        CHSNavigator.goBack(this);
    }

    save() {
        if (this.props.individual.voided) {
            Alert.alert(this.I18n.t("voidedIndividualAlertTitle"),
                this.I18n.t("voidedIndividualAlertMessage"));
        } else {
            this.dispatchAction(Actions.SAVE, {
                cb: () => this.props.onSaveCallback(this),
            });
        }
    }


    toggleRelation(relationUUID) {
        const selectedRelation = this.state.relations.find((relation) => relation.uuid === relationUUID);
        return this.dispatchAction(Actions.INDIVIDUAL_ADD_RELATIVE_SELECT_RELATION, {value: selectedRelation});
    }

    renderRelations() {
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        const labelValuePairs = this.state.relations.map(({uuid, name}) => new RadioLabelValue(name, uuid));
        return (
            <SelectableItemGroup
                allowRadioUnselect={false}
                style={this.props.style}
                inPairs={true}
                onPress={(value) => this.toggleRelation(value)}
                selectionFn={(relationUUID) => this.state.individualRelative.relation.uuid === relationUUID}
                labelKey={this.I18n.t('Relation')}
                mandatory={true}
                I18n={this.I18n}
                locale={locale}
                labelValuePairs={labelValuePairs}
                validationError={AbstractDataEntryState.getValidationError(this.state, IndividualRelative.validationKeys.RELATION)}
            />
        );

    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const headerMessage = `${this.I18n.t(this.props.individual.nameString)} - ${this.I18n.t('addARelative')}`;
        const searchHeaderMessage = `${headerMessage} - ${this.I18n.t('search')}`;
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={headerMessage}/>
                    <ScrollView style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <IndividualFormElement
                            individualNameValue={_.isNil(this.state.individualRelative.relative.name) ? "" : this.state.individualRelative.relative.name}
                            element={new StaticFormElement('Relative', true)}
                            inputChangeActionName={Actions.INDIVIDUAL_ADD_RELATIVE_SELECT_INDIVIDUAL}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, IndividualRelative.validationKeys.RELATIVE)}
                            searchHeaderMessage={searchHeaderMessage}
                        />
                        {this.renderRelations()}

                        <WizardButtons previous={{func: () => this.previous(), label: this.I18n.t('previous')}}
                                       next={{
                                           func: () => this.save(),
                                           label: this.I18n.t('save')
                                       }}
                                       style={{marginHorizontal: 24}}/>
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualAddRelativeView;
