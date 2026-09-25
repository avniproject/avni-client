import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import {QuestionGroup as QuestionGroupModel, RepeatableQuestionGroup} from 'avni-models';
import QuestionGroup from "./QuestionGroup";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import Line from "../../common/Line";
import _ from "lodash";

class RepeatableFormElement extends AbstractFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResults: PropTypes.array,
        extraStyle: PropTypes.object,
        formElementsUserState: PropTypes.object,
        observationHolder: PropTypes.object,
        filteredFormElements: PropTypes.array,
        actions: PropTypes.object,
        subjectUUID: PropTypes.string,
        // Same (x, y) => scrollTo(...) callback FormElementGroup already threads down for
        // scrolling to a validation error - reused here to scroll to the row just added.
        scrollToPosition: PropTypes.func
    };

    static defaultProps = {
        style: {},
    };

    constructor(props, context) {
        super(props, context);
        this.rowKeys = [];
        // First card is implicitly the one being worked on when the user lands here, so it
        // starts highlighted rather than waiting for an "Add More" press.
        this.activeRowIndex = 0;
    }

    onAdd() {
        // Index the new row will land at once the dispatch below appends it - renderQuestionGroup
        // uses this to know which row to scroll to once it's laid out.
        this.pendingScrollRowIndex = this.props.value.size();
        // "Currently focused" row - drives both the highlighted border below and the follow-up
        // scroll in renderAddMoreButton. Stays set (keeping the border) until a different row is
        // added or this one is removed; the one-shot follow-up scroll has its own flag so it only
        // fires once even though the border sticks around longer.
        this.activeRowIndex = this.pendingScrollRowIndex;
        this.followUpScrollPending = true;
        this.rowKeys.push(_.uniqueId('rqg_'));
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.add,
            parentFormElement: this.props.element,
            formElement: this.props.element
        });
    }

    // Marks the row the user is currently touching/working in as active, so the highlighted
    // border follows whichever card they're actually filling in, not just the last one added.
    onCardInteraction(questionGroupIndex) {
        if (this.activeRowIndex !== questionGroupIndex) {
            this.activeRowIndex = questionGroupIndex;
            this.forceUpdate();
        }
    }

    onRemove(questionGroupIndex) {
        this.rowKeys.splice(questionGroupIndex, 1);
        // Stop tracking rather than risk the border/follow-up scroll referring to a stale/shifted index.
        if (this.activeRowIndex === questionGroupIndex) {
            this.activeRowIndex = null;
            this.followUpScrollPending = false;
        }
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.remove,
            parentFormElement: this.props.element,
            formElement: this.props.element,
            questionGroupIndex
        });
    }

    actionButton(label, onPress, isDisabled, primaryColor) {
        const color = isDisabled ? Colors.DisabledButtonColor : primaryColor;
        return this.props.element.recordValueByKey('disableManualActions') ? null :
            <TouchableOpacity activeOpacity={0.5}
                              disabled={isDisabled}
                              onPress={onPress}
                              style={[styles.actionButton, {borderColor: color}]}>
                <Text numberOfLines={1} style={{fontSize: Styles.normalTextSize, fontWeight: '500', color}}>{label}</Text>
            </TouchableOpacity>;
    }

    removeButton(onPress, isDisabled) {
        const color = isDisabled ? Colors.DisabledButtonColor : Colors.NegativeActionButtonColor;
        return this.props.element.recordValueByKey('disableManualActions') ? null :
            <TouchableOpacity activeOpacity={0.5}
                              disabled={isDisabled}
                              onPress={onPress}
                              style={styles.removeButton}>
                <Icon name="minus-circle" size={32} color={color}/>
            </TouchableOpacity>;
    }

    // this.props.element is the repeatable group's own FormElement (not a FormElementGroup), so it
    // has no getFormElements() - the group's child questions instead live in filteredFormElements,
    // matched by groupUuid, the same way QuestionGroup.getChildFormElements() finds them.
    get childFormElements() {
        return _.filter(this.props.filteredFormElements, fe => fe.groupUuid === this.props.element.uuid);
    }

    // True for repeatable groups whose rows capture an image/video. The "x" on the image itself
    // only clears that one image, not the whole row - the minus-circle is still needed to remove
    // the row/section itself, so this flag is only used for the min-count hint below.
    get hasOwnRowRemoveControl() {
        return _.some(this.childFormElements, fe => _.includes(['Image', 'Video'], _.get(fe, 'concept.datatype')));
    }

    // Configurable via a "minNumberOfMedia" key-value on the repeatable group's concept in the
    // Form Builder; defaults to the 8-image minimum this field was originally designed around.
    get minRequiredRowCount() {
        return this.props.element.recordValueByKey('minNumberOfMedia') || 8;
    }

    // Same group-level result QuestionGroup itself looks up (formIdentifier === the repeatable
    // group's own uuid) - this is what used to drive the red "please add at least N" error text.
    get groupValidationResult() {
        return _.find(this.props.validationResults, ({formIdentifier}) => formIdentifier === this.props.element.uuid);
    }

    // Review-only groups (e.g. AI-results screens showing previously captured images) already
    // disable add/remove via "disableManualActions" - the "please add at least N" hint only makes
    // sense while actively capturing photos, i.e. wherever manual add/remove is actually possible.
    // It also only makes sense while the same condition that used to show the red error text is
    // true - once that requirement is satisfied, the hint should disappear just like the error did.
    get shouldShowMinimumCountHint() {
        const validationResult = this.groupValidationResult;
        return this.hasOwnRowRemoveControl && !this.props.element.recordValueByKey('disableManualActions')
            && !_.isNil(validationResult) && validationResult.success === false;
    }

    renderMinimumCountHint() {
        const required = this.minRequiredRowCount;
        // .size() counts rows regardless of whether they've been filled in - the group always
        // starts with one empty row, so it would misleadingly read "1/8" before anything is
        // actually captured. nonEmptySize() only counts rows with data, so this starts at 0.
        const capturedCount = this.props.value.nonEmptySize();
        return (
            <View style={styles.minCountRow}>
                <Text style={styles.minCountText}>
                    {this.I18n.t('pleaseAddAtLeastNImages', {count: required})}
                </Text>
                <View style={styles.minCountBadge}>
                    <Text style={styles.minCountBadgeText}>{`${capturedCount}/${required}`}</Text>
                </View>
            </View>
        );
    }

    renderQuestionGroup(questionGroupIndex) {
        const isRemoveDisabled = this.props.value.size() <= 1;
        if (!this.rowKeys[questionGroupIndex]) {
            this.rowKeys[questionGroupIndex] = _.uniqueId('rqg_');
        }
        const content = (
            <Fragment>
                {this.removeButton(() => this.onRemove(questionGroupIndex), isRemoveDisabled)}
                <QuestionGroup
                    questionGroupIndex={questionGroupIndex}
                    element={this.props.element}
                    actionName={this.props.actionName}
                    actions={this.props.actions}
                    formElementsUserState={this.props.formElementsUserState}
                    observationHolder={this.props.observationHolder}
                    value={this.props.value.getGroupObservationAtIndex(questionGroupIndex) || new QuestionGroupModel()}
                    validationResults={this.props.validationResults}
                    filteredFormElements={this.props.filteredFormElements}
                    extraContainerStyle={{marginVertical: 0}}
                    subjectUUID={this.props.subjectUUID}
                    suppressGroupValidationMessage={this.shouldShowMinimumCountHint}
                    hideLastElementSeparator={true}
                />
            </Fragment>
        );
        const needsScrollListener = this.pendingScrollRowIndex === questionGroupIndex && _.isFunction(this.props.scrollToPosition);
        return (
            <View key={this.rowKeys[questionGroupIndex]}
                  style={[styles.row, this.activeRowIndex === questionGroupIndex && styles.activeRow]}
                  onTouchStart={() => this.onCardInteraction(questionGroupIndex)}
                  onLayout={needsScrollListener ? (event) => {
                      this.pendingScrollRowIndex = null;
                      const {x, y} = event.nativeEvent.layout;
                      this.props.scrollToPosition(x, y);
                  } : undefined}>
                {content}
            </View>
        );
    }

    // A second scroll for the case AbstractComponent's onLayout-once approach in
    // renderQuestionGroup doesn't cover: the row just added starts out short (no photo yet), so
    // the first scroll lands correctly, but once the photo is captured the row grows taller and
    // "Add More" ends up below the fold again. Fires once, only while still tracking that row.
    renderAddMoreButton(isAddDisabled) {
        const button = this.actionButton(this.I18n.t('addMoreItem'), () => this.onAdd(), isAddDisabled, Colors.ActionButtonColor);
        if (_.isNil(this.activeRowIndex) || !this.followUpScrollPending || !_.isFunction(this.props.scrollToPosition)) {
            return button;
        }
        const activeRowValue = this.props.value.getGroupObservationAtIndex(this.activeRowIndex);
        if (_.isNil(activeRowValue) || activeRowValue.isEmpty()) {
            return button;
        }
        return (
            <View onLayout={(event) => {
                this.followUpScrollPending = false;
                const {x, y} = event.nativeEvent.layout;
                this.props.scrollToPosition(x, y);
            }}>
                {button}
            </View>
        );
    }

    render() {
        const isAddDisabled = this.props.value.nonEmptySize() !== this.props.value.size();
        return (
            <View style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.shouldShowMinimumCountHint && this.renderMinimumCountHint()}
                {_.map(_.range(0, _.max([1, this.props.value.size()])), index => {
                    const rowCount = _.max([1, this.props.value.size()]);
                    return (
                        <Fragment key={`group-${index}`}>
                            {this.renderQuestionGroup(index)}
                            {index < rowCount - 1 && <Line height={20} color={Colors.InputBorderNormal}/>}
                        </Fragment>
                    );
                })}
                {this.renderAddMoreButton(isAddDisabled)}
            </View>
        );
    }

}

const styles = StyleSheet.create({
    row: {
        borderWidth: 1,
        borderColor: '#DAF3F4',
        borderRadius: 8,
        padding: 8,
        marginBottom: 20,
    },
    activeRow: {
        borderColor: Colors.BrandPrimaryDark,
    },
    removeButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignSelf: 'flex-end',
        marginTop: 10,
        paddingHorizontal: 20,
        height: 56,
        borderWidth: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    minCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    minCountText: {
        flex: 1,
        color: Colors.BrandPrimaryDark,
        fontSize: Styles.smallTextSize,
    },
    minCountBadge: {
        minWidth: 40,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
        backgroundColor: Colors.BrandPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    minCountBadgeText: {
        color: Colors.BrandLight,
        fontSize: Styles.smallerTextSize,
        fontWeight: '600',
    }
});

export default RepeatableFormElement;
