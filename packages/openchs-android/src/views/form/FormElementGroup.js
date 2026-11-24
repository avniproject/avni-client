import {View, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './formElement/MultiSelectFormElement';
import SingleSelectFormElement from './formElement/SingleSelectFormElement';
import NumericFormElement from './formElement/NumericFormElement';
import TextFormElement from './formElement/TextFormElement';
import DateFormElement from './formElement/DateFormElement';
import TimeFormElement from './formElement/TimeFormElement';
import _ from "lodash";
import {
    Concept,
    MultipleCodedValues,
    SingleCodedValue,
    PrimitiveValue,
    Duration,
    CompositeDuration,
    ValidationResult,
    PhoneNumber,
    QuestionGroup,
    RepeatableQuestionGroup
} from 'openchs-models';
import Distances from '../primitives/Distances';
import DurationDateFormElement from "./formElement/DurationDateFormElement";
import Styles from "../primitives/Styles";
import SingleSelectMediaFormElement from "./formElement/SingleSelectMediaFormElement";
import IdFormElement from "./formElement/IdFormElement";
import DurationFormElement from "./formElement/DurationFormElement";
import LocationHierarchyFormElement from "./formElement/LocationHierarchyFormElement";
import PhoneNumberFormElement from "./formElement/PhoneNumberFormElement";
import GroupAffiliationFormElement from "./formElement/GroupAffiliationFormElement";
import AudioFormElement from "./formElement/AudioFormElement";
import Identifier from "openchs-models/dist/Identifier";
import MultiSelectSubjectLandingFormElement from "./formElement/MultiSelectSubjectLandingFormElement";
import SingleSelectSubjectLandingFormElement from "./formElement/SingleSelectSubjectLandingFormElement";
import QuestionGroupFormElement from "./formElement/QuestionGroupFormElement";
import MultiSelectMediaFormElement from "./formElement/MultiSelectMediaFormElement";
import SingleSelectFileFormElement from "./formElement/SingleSelectFileFormElement";
import MultiSelectFileFormElement from "./formElement/MultiSelectFileFormElement";
import RepeatableFormElement from "./formElement/RepeatableFormElement";
import SingleSelectEncounterFormElement from "./formElement/SingleSelectEncounterFormElement";
import MultiSelectEncounterFormElement from "./formElement/MultiSelectEncounterFormElement";
import MediaV2FormElement from "./formElement/MediaV2FormElement";
import Colors from "../primitives/Colors";
import DeviceReadingButton, {deviceTestFor, isAnuPathDetailsElement} from "./device/DeviceReadingButton";
import {CARD_GROUP_KEY, captureQuestionPhrase, normaliseName} from "../../utility/anupath/AnuPathFields";

class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: PropTypes.object.isRequired,
        filteredFormElements: PropTypes.any,
        observationHolder: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        validationResults: PropTypes.array,
        formElementsUserState: PropTypes.object,
        dataEntryDate: PropTypes.object,
        onValidationError: PropTypes.func,
        subjectUUID: PropTypes.string,
        syncRegistrationConcept1UUID: PropTypes.string,
        syncRegistrationConcept2UUID: PropTypes.string,
        allowedSyncConcept1Values: PropTypes.array,
        allowedSyncConcept2Values: PropTypes.array,
    };

    constructor(props, context) {
        super(props, context);
    }

    wrap(x, idx, shouldScroll) {
        return <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements, paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge}}
                     key={idx}
                     onLayout={(event) => {
                         if (!shouldScroll || !_.isFunction(this.props.onValidationError)) return;

                         //Do not jump around if the error is in the same question
                         if (this.lastScrolledErrorUuid === idx) return;

                         this.lastScrolledErrorUuid = idx;
                         this.props.onValidationError(event.nativeEvent.layout.x, event.nativeEvent.layout.y);
                     }}>{x}</View>;
    }

    getCompositeDuration(concept, formElement) {
        const observation = this.props.observationHolder.findObservation(concept);
        const durationOptions = formElement.durationOptions;
        if (_.isNil(observation)) {
            return CompositeDuration.fromOpts(durationOptions);
        } else {
            return observation.getValueWrapper();
        }
    }

    getDuration(concept, formElementUserState, formElement) {
        const observation = this.props.observationHolder.findObservation(concept);
        if (_.isNil(observation)) {
            return new Duration(null, formElement.durationOptions[0]);
        } else {
            const date = observation.getValueWrapper().getValue();
            if (_.isNil(formElementUserState)) {
                return Duration.fromDataEntryDate(formElement.durationOptions[0], date, this.props.dataEntryDate);
            } else {
                return Duration.fromDataEntryDate(formElementUserState.durationUnit, date, this.props.dataEntryDate);
            }
        }
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.observationHolder.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }

    allowedValues(concept) {
        if (this.props.syncRegistrationConcept1UUID === concept.uuid) {
            return this.props.allowedSyncConcept1Values;
        } else if (this.props.syncRegistrationConcept2UUID === concept.uuid) {
            return this.props.allowedSyncConcept2Values;
        }
        return null;
    }

    render() {
        const sortedFormElements = this.props.group.getFormElements();
        const firstErroredFE = _.chain(sortedFormElements)
            .intersectionWith(this.props.validationResults, (a, b) => a.uuid === b.formIdentifier)
            .head()
            .value();
        const erroredUUID = firstErroredFE && firstErroredFE.uuid;
        if (this.lastScrolledErrorUuid && this.lastScrolledErrorUuid !== erroredUUID) {
            this.lastScrolledErrorUuid = null;
        }
        //A hidden concept's question stays in filteredFormElements, which keeps its answer, and is only left out of the drawing.
        //A child draws only through its group, so a child of a hidden group is left out too, and a group with no child left
        //to draw is left out with its frame. The heading below goes when nothing is left.
        const allFormElements = _.isNil(this.props.filteredFormElements) ? this.props.group.getFormElements() : this.props.filteredFormElements;
        const isHidden = (fe) => fe.concept.isHidden();
        const groupOf = (child) => _.find(allFormElements, (fe) => fe.uuid === child.groupUuid);
        const drawsAChild = (group) => _.some(allFormElements, (fe) => fe.groupUuid === group.uuid && !fe.voided && !isHidden(fe));
        const formElements = allFormElements.filter((fe) => {
            if (isHidden(fe)) return false;
            if (fe.isQuestionGroup()) {
                const group = groupOf(fe);
                return !_.isNil(group) && !isHidden(group);
            }
            return !fe.concept.isQuestionGroup() || drawsAChild(fe);
        });
        const topLevelElements = formElements.filter(fm => !fm.isQuestionGroup());
        // Includes questions whose concept is hidden (stored and synced, never drawn), e.g. "Device details".
        const allTopLevelElements = allFormElements.filter(fm => !fm.isQuestionGroup());
        // The last question inside a card drops its own divider; the card draws one below itself instead.
        const lastInCard = this.lastElementsOfCards(topLevelElements);
        const unsupportedFormElements = formElements.filter(fe => !_.includes(_.values(Concept.dataType), fe.concept.datatype));
        return (<View>
                {formElements.length < 1 ? <View/> :
                    <View style={{backgroundColor: Colors.SectionHeaderBackground, paddingVertical: 10}}>
                        <Text
                            style={[
                                Styles.formGroupLabel,
                                // this.props.group.styles, // temporarily disabled: forcing the new design's grey/dark-teal look for every form's group header, overriding any per-group backgroundColour/textColour set in the Form Builder. Re-enable (and drop the two lines below) to restore per-form custom group colors.
                                {paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge},
                                {color: Colors.BrandPrimaryDark, fontWeight: '500'}
                            ]}>
                            {this.I18n.t(this.props.group.name)}
                        </Text>
                    </View>
                }
                {
                    unsupportedFormElements.length > 0 ?
                        <Text style={[Styles.formLabel, {
                            paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                            color: Colors.ValidationError
                        }]}>
                            {this.I18n.t("Please update the app to access new features.")}
                        </Text> : <View/>
                }
                {
                    this.groupIntoCards(topLevelElements, topLevelElements.map((formElement, idx) => {
                        const validationResult = ValidationResult.findByFormIdentifier(this.props.validationResults, formElement.uuid);
                        const allowedValues = this.allowedValues(formElement.concept);
                        const uniqueKey = formElement.uuid;
                        if (formElement.concept.datatype === Concept.dataType.Numeric) {
                            const deviceTest = deviceTestFor(formElement);
                            const numericValue = this.getSelectedAnswer(formElement.concept, new PrimitiveValue());
                            const numeric = <NumericFormElement
                                element={formElement}
                                inputChangeActionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                endEditingActionName={this.props.actions["PRIMITIVE_VALUE_END_EDITING"]}
                                value={numericValue}
                                validationResult={validationResult}
                                allowedValues={allowedValues}
                                readOnly={!_.isNil(deviceTest)}
                                emptyText={_.isNil(deviceTest) ? undefined : this.I18n.t("Not read yet")}/>;
                            if (_.isNil(deviceTest)) return this.wrap(numeric, uniqueKey, formElement.uuid === erroredUUID);
                            return this.wrap(<View>
                                {numeric}
                                <DeviceReadingButton testName={deviceTest}
                                                     valueElement={formElement}
                                                     detailsElement={this.deviceDetailsAfter(allTopLevelElements, formElement)}
                                                     hasValue={!_.isNil(numericValue.getValue())}
                                                     actions={this.props.actions}/>
                            </View>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if ((formElement.concept.datatype === Concept.dataType.Text || formElement.concept.datatype === Concept.dataType.Notes)) {
                            return this.wrap(<TextFormElement
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                                multiline={formElement.concept.datatype !== Concept.dataType.Text}
                                allowedValues={allowedValues}
                                readOnly={isAnuPathDetailsElement(formElement)}
                                emptyText={isAnuPathDetailsElement(formElement) ? this.I18n.t("Filled from the device") : undefined}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectFormElement key={uniqueKey}
                                                                     element={formElement}
                                                                     hideBottomBorder={lastInCard.has(formElement.uuid)}
                                                                     multipleCodeValues={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                                                     actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                                                     validationResult={validationResult}
                                                                     allowedValues={allowedValues}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectFormElement key={uniqueKey}
                                                                      element={formElement}
                                                                      hideBottomBorder={lastInCard.has(formElement.uuid)}
                                                                      singleCodedValue={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                                                      actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                                                      validationResult={validationResult}
                                                                      allowedValues={allowedValues}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Date && _.isNil(formElement.durationOptions)) {
                            return this.wrap(<DateFormElement key={uniqueKey}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, uniqueKey, formElement.uuid === erroredUUID);

                        } else if (formElement.concept.datatype === Concept.dataType.DateTime) {
                            return this.wrap(<DateFormElement key={uniqueKey}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Date && !_.isNil(formElement.durationOptions)) {
                            return this.wrap(<DurationDateFormElement key={uniqueKey} label={formElement.name}
                                                                      actionName={this.props.actions["DATE_DURATION_CHANGE"]}
                                                                      durationOptions={formElement.durationOptions}
                                                                      duration={this.getDuration(formElement.concept, this.props.formElementsUserState[formElement.uuid], formElement)}
                                                                      dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                                      validationResult={validationResult}
                                                                      element={formElement}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Time) {
                            return this.wrap(<TimeFormElement key={uniqueKey}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              timeValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Duration && !_.isNil(formElement.durationOptions)) {
                            return this.wrap(<DurationFormElement key={uniqueKey} label={formElement.name}
                                                                  actionName={this.props.actions["DURATION_CHANGE"]}
                                                                  compositeDuration={this.getCompositeDuration(formElement.concept, formElement)}
                                                                  noDateMessageKey='chooseADate'
                                                                  validationResult={validationResult}
                                                                  element={formElement}/>, uniqueKey, formElement.uuid === erroredUUID);
                        } else if ([Concept.dataType.Image, Concept.dataType.Video].includes(formElement.concept.datatype) && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectMediaFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                value={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if ([Concept.dataType.Image, Concept.dataType.Video].includes(formElement.concept.datatype) && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectMediaFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                value={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if ([Concept.dataType.ImageV2].includes(formElement.concept.datatype)) {
                            return this.wrap(<MediaV2FormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Id) {
                            return this.wrap(<IdFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new Identifier())}
                                validationResult={validationResult}
                                multiline={false}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Location) {
                            return this.wrap(<LocationHierarchyFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, uniqueKey, false);
                        } else if (formElement.concept.datatype === Concept.dataType.Subject && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectSubjectLandingFormElement
                                key={uniqueKey}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                subjectUUID={this.props.subjectUUID}
                                actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Subject && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectSubjectLandingFormElement
                                key={uniqueKey}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                subjectUUID={this.props.subjectUUID}
                                actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.PhoneNumber) {
                            return this.wrap(<PhoneNumberFormElement
                                element={formElement}
                                inputChangeActionName={this.props.actions["PHONE_NUMBER_CHANGE"]}
                                successVerificationActionName={this.props.actions["ON_SUCCESS_OTP_VERIFICATION"]}
                                skipVerificationActionName={this.props.actions["ON_SKIP_VERIFICATION"]}
                                value={this.getSelectedAnswer(formElement.concept, new PhoneNumber())}
                                observation={this.props.observationHolder.findObservation(formElement.concept)}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        }
                        else if (formElement.concept.datatype === Concept.dataType.GroupAffiliation) {
                            return this.wrap(<GroupAffiliationFormElement
                                element={formElement}
                                actionName={this.props.actions["TOGGLE_GROUPS"]}
                                groupSubjectObservation={_.find(_.get(this.props.groupAffiliation, 'groupSubjectObservations'), ({concept, groupSubject}) => concept.uuid === formElement.concept.uuid && !groupSubject.voided)}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        }
                        else if ([Concept.dataType.Audio].includes(formElement.concept.datatype)) {
                            return this.wrap(<AudioFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        }
                        else if ([Concept.dataType.File].includes(formElement.concept.datatype) && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectFileFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                value={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if ([Concept.dataType.File].includes(formElement.concept.datatype) && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectFileFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                value={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.QuestionGroup && !formElement.repeatable) {
                            return this.wrap(<QuestionGroupFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["GROUP_QUESTION_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new QuestionGroup())}
                                validationResults={this.props.validationResults}
                                filteredFormElements={this.props.filteredFormElements}
                                actions={this.props.actions}
                                formElementsUserState={this.props.formElementsUserState}
                                observationHolder={this.props.observationHolder}
                                subjectUUID={this.props.subjectUUID}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Encounter && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectEncounterFormElement
                                key={uniqueKey}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                subjectUUID={this.props.subjectUUID}
                                actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Encounter && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectEncounterFormElement
                                key={uniqueKey}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                subjectUUID={this.props.subjectUUID}
                                actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.QuestionGroup && formElement.repeatable) {
                            return this.wrap(<RepeatableFormElement
                                key={uniqueKey}
                                element={formElement}
                                actionName={this.props.actions["REPEATABLE_GROUP_QUESTION_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new RepeatableQuestionGroup())}
                                validationResults={this.props.validationResults}
                                filteredFormElements={this.props.filteredFormElements}
                                actions={this.props.actions}
                                formElementsUserState={this.props.formElementsUserState}
                                observationHolder={this.props.observationHolder}
                                subjectUUID={this.props.subjectUUID}
                                scrollToPosition={this.props.onValidationError}
                            />, uniqueKey, formElement.uuid === erroredUUID);
                        }
                    }))
                }
            </View>
        );
    }

    // Visual grouping of related questions into one bordered card (display only - observations are
    // unchanged, and questions hidden by rules simply drop out of the card). Two ways a card is formed:
    //  1. Server config: consecutive questions whose form element or concept has the same `cardGroup`
    //     key-value.
    //  2. No server config needed: a capture-method question shown as a segmented control
    //     (`displayAsSegmented`, e.g. "How is the Blood Glucose value captured?") starts a card with the
    //     questions that follow it and belong to the same value: the device value, "Device details" and
    //     questions containing the whole phrase between "How is the" and "captured" (here "Blood Glucose
    //     value", e.g. "Blood Glucose value (manual)"). Other questions, e.g. "Random blood glucose (RBS)",
    //     are not part of it. The card stops at the first question that does not belong or at the next
    //     capture-method question - so the rest of the page is never swallowed.
    cardGroupOf(formElement) {
        const value = _.invoke(formElement, 'recordValueByKey', CARD_GROUP_KEY) ??
            _.invoke(formElement.concept, 'recordValueByKey', CARD_GROUP_KEY);
        return _.isNil(value) || value === '' ? null : String(value);
    }

    startsCaptureCard(formElement) {
        if (!formElement.isSingleSelect || !formElement.isSingleSelect()) return false;
        const flag = _.invoke(formElement, 'recordValueByKey', SEGMENTED_KEY) ??
            _.invoke(formElement.concept, 'recordValueByKey', SEGMENTED_KEY);
        return flag === true || flag === 'true';
    }

    // The value a capture-method question is about: "How is the Blood Glucose value captured?" -> "blood glucose value".
    captureCardPhrase(formElement) {
        return captureQuestionPhrase(formElement.name);
    }

    belongsToCaptureCard(formElement, phrase) {
        if (!_.isNil(deviceTestFor(formElement)) || isAnuPathDetailsElement(formElement)) return true;
        if (_.isEmpty(phrase)) return false;
        return normaliseName(formElement.name).includes(phrase) ||
            normaliseName(_.get(formElement, 'concept.name')).includes(phrase);
    }

    // Returns the index just past the card that starts at `start`, or `start` when no card starts there.
    cardEnd(elements, start) {
        const group = this.cardGroupOf(elements[start]);
        if (!_.isNil(group)) {
            let i = start;
            while (i < elements.length && this.cardGroupOf(elements[i]) === group) i++;
            return i;
        }
        if (!this.startsCaptureCard(elements[start])) return start;
        const phrase = this.captureCardPhrase(elements[start]);
        let i = start + 1;
        while (i < elements.length) {
            if (this.startsCaptureCard(elements[i])) break;
            if (!this.belongsToCaptureCard(elements[i], phrase)) break;
            i++;
        }
        return i;
    }

    // The "Device details" question that belongs to a device-value question: the first one after it on the page.
    // `elements` includes hidden-concept questions, so the details are still saved (and synced) when the
    // server hides that question from the screen.
    deviceDetailsAfter(elements, valueElement) {
        const start = _.findIndex(elements, (fe) => fe.uuid === valueElement.uuid);
        const found = _.find(_.drop(elements, start + 1), isAnuPathDetailsElement) || null;
        if (__DEV__ && _.isNil(found)) this.logMissingDeviceDetails(valueElement);
        return found;
    }

    // Debug builds only: why no "Device details" question was found for a device value (logged once).
    logMissingDeviceDetails(valueElement) {
        this.loggedMissingDetails = this.loggedMissingDetails || new Set();
        if (this.loggedMissingDetails.has(valueElement.uuid)) return;
        this.loggedMissingDetails.add(valueElement.uuid);
        const onPage = _.filter(this.props.group.getFormElements(), isAnuPathDetailsElement);
        if (_.isEmpty(onPage)) {
            console.log(`[anuPath] No "Device details" question (Text/Notes with key-values deviceModule = anuPath, deviceField = details) on page "${this.props.group.name}".`);
            return;
        }
        const applicable = this.props.filteredFormElements || [];
        onPage.forEach((fe) => console.log(`[anuPath] "${fe.name}": concept hidden=${fe.concept.isHidden()}, ` +
            `applicable=${_.some(applicable, (a) => a.uuid === fe.uuid)}, voided=${!!fe.voided}. ` +
            'It is saved only when applicable=true (hide it with the concept\'s "hidden" setting, not a visibility rule).'));
    }

    lastElementsOfCards(elements) {
        const last = new Set();
        let i = 0;
        while (i < elements.length) {
            const end = this.cardEnd(elements, i);
            if (end === i) {
                i++;
                continue;
            }
            last.add(elements[end - 1].uuid);
            i = end;
        }
        return last;
    }

    groupIntoCards(elements, nodes) {
        const out = [];
        let i = 0;
        while (i < elements.length) {
            const end = this.cardEnd(elements, i);
            if (end === i) {
                out.push(nodes[i]);
                i++;
                continue;
            }
            out.push(<View key={`card-${elements[i].uuid}`} style={cardStyle}>{nodes.slice(i, end)}</View>);
            out.push(<View key={`card-divider-${elements[i].uuid}`} style={cardDividerStyle}/>);
            i = end;
        }
        return out;
    }
}

const SEGMENTED_KEY = "displayAsSegmented";
const cardStyle = {
    marginTop: Distances.ScaledVerticalSpacingBetweenFormElements,
    marginHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
    paddingBottom: Distances.ScaledVerticalSpacingBetweenFormElements,
    borderWidth: 1,
    borderColor: Colors.TextHint,
    borderRadius: 8,
    backgroundColor: Colors.WhiteContentBackground
};
// Same 1px line every other question gets below it, drawn under the card instead of inside it.
const cardDividerStyle = {
    marginTop: Distances.ScaledVerticalSpacingBetweenFormElements,
    marginHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
    height: 1,
    backgroundColor: Colors.InputBorderNormal
};

export default FormElementGroup;
