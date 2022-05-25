import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {StyleSheet, View} from "react-native";
import {Concept, PrimitiveValue, ValidationResult, MultipleCodedValues, SingleCodedValue, Identifier} from 'avni-models';
import _ from 'lodash';
import ValidationErrorMessage from "../ValidationErrorMessage";
import NumericFormElement from "./NumericFormElement";
import TextFormElement from "./TextFormElement";
import Colors from "../../primitives/Colors";
import DateFormElement from "./DateFormElement";
import FileFormElement from "./FileFormElement";
import AudioFormElement from "./AudioFormElement";
import TimeFormElement from "./TimeFormElement";
import SingleSelectMediaFormElement from "./SingleSelectMediaFormElement";
import IdFormElement from "./IdFormElement";
import LocationHierarchyFormElement from "./LocationHierarchyFormElement";
import SingleSelectFormElement from "./SingleSelectFormElement";
import MultiSelectFormElement from "./MultiSelectFormElement";

class QuestionGroupFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResults: PropTypes.array,
        filteredFormElements: PropTypes.array,
    };

    constructor(props, context) {
        super(props, context);
    }

    getChildFormElements() {
        return _.sortBy(
            _.filter(this.props.filteredFormElements, ffe => ffe.groupUuid === this.props.element.uuid && !ffe.voided),
            "displayOrder"
        );
    }

    getValidationResultForFormElement(formElement) {
        return ValidationResult.findByFormIdentifier(this.props.validationResults, formElement.uuid)
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.value.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }

    renderTextFormElement(formElement) {
        return <TextFormElement
            key={formElement.concept.uuid}
            element={formElement}
            parentElement={this.props.element}
            actionName={this.props.actionName}
            value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
            validationResult={this.getValidationResultForFormElement(formElement)}
            multiline={false}
            containerStyle={styles.groupContainerStyle}
            labelStyle={styles.groupLabelStyle}
            inputStyle={styles.groupInputStyle}
        />
    }

    renderNumericFormElement(formElement) {
        return <NumericFormElement
            key={formElement.concept.uuid}
            element={formElement}
            parentElement={this.props.element}
            inputChangeActionName={this.props.actionName}
            value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
            validationResult={this.getValidationResultForFormElement(formElement)}
            containerStyle={styles.groupContainerStyle}
            labelStyle={styles.groupLabelStyle}
            inputStyle={styles.groupInputStyle}
        />
    }

    render() {
        const allGroupQuestions = this.getChildFormElements();
        const textNumericAndNotes = _.filter(allGroupQuestions, ({concept}) => _.includes([Concept.dataType.Text, Concept.dataType.Numeric, Concept.dataType.Notes], concept.datatype));
        const otherQuestions = _.filter(allGroupQuestions, ({concept}) => !_.includes([Concept.dataType.Text, Concept.dataType.Numeric, Concept.dataType.Notes], concept.datatype));
        return (<View>
                {this.label}
                <View>
                    <View style={styles.mainContainerStyle}>
                        {_.map(textNumericAndNotes, groupQuestionFormElement => {
                            const concept = groupQuestionFormElement.concept;
                            switch (concept.datatype) {
                                case Concept.dataType.Text :
                                    return this.renderTextFormElement(groupQuestionFormElement);
                                case Concept.dataType.Numeric:
                                case Concept.dataType.Notes:
                                    return this.renderNumericFormElement(groupQuestionFormElement);
                            }
                        })}
                    </View>
                    {_.map(otherQuestions, fe => {
                        const concept = fe.concept;
                        const validationResult = this.getValidationResultForFormElement(fe);
                        const commonProps = {
                            key: fe.uuid,
                            element: fe,
                            actionName: this.props.actionName,
                            validationResult: validationResult,
                            parentElement: this.props.element,
                        };
                        const dataType = concept.datatype;
                        const dataTypes = Concept.dataType;
                        if (dataType === dataTypes.Coded && fe.isSingleSelect()) {
                            return <SingleSelectFormElement
                                singleCodedValue={this.getSelectedAnswer(fe.concept, new SingleCodedValue())} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.Coded && fe.isMultiSelect()) {
                            return <MultiSelectFormElement
                                multipleCodeValues={this.getSelectedAnswer(fe.concept, new MultipleCodedValues())} {...commonProps}/>;
                        }
                        if ((dataType === dataTypes.Date && _.isNil(fe.durationOptions)) || dataType === dataTypes.DateTime) {
                            return <DateFormElement
                                dateValue={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.File) {
                            return <FileFormElement
                                value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.Audio) {
                            return <AudioFormElement
                                value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.Time) {
                            return <TimeFormElement
                                timeValue={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                        if (_.includes([dataTypes.Image, dataTypes.Video], dataType)) {
                            return <SingleSelectMediaFormElement
                                value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.Id) {
                            return <IdFormElement
                                value={this.getSelectedAnswer(fe.concept, new Identifier())}
                                multiline={false} {...commonProps}/>;
                        }
                        if (dataType === dataTypes.Location) {
                            return <LocationHierarchyFormElement
                                value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                        }
                    })}
                    <ValidationErrorMessage
                        validationResult={this.getValidationResultForFormElement(this.props.element)}/>
                </View>
            </View>
        )
    }

}

const styles = StyleSheet.create({
    mainContainerStyle: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        borderTopWidth: 1,
        borderTopColor: Colors.InputBorderNormal,
        marginVertical: 3,
    },
    groupContainerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 1,
        borderRightWidth: 1,
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderRightColor: Colors.InputBorderNormal,
        borderLeftColor: Colors.InputBorderNormal,
        borderBottomColor: Colors.InputBorderNormal,
    },
    groupLabelStyle: {
        paddingLeft: 1,
        flex: 0.5,
    },
    groupInputStyle: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.InputBorderNormal,
        paddingLeft: 1,
        flex: 0.5
    },
});

export default QuestionGroupFormElement;
