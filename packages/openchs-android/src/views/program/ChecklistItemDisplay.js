import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Text} from "native-base";
import General from "../../utility/General";
import {Alert, View, TouchableHighlight} from "react-native";
import _ from "lodash";
import CHSNavigator from "../../utility/CHSNavigator";
import {  ObservationsHolder  } from 'avni-models';
import { AvniAlert } from "../common/AvniAlert";

class ChecklistItemDisplay extends AbstractComponent {
    static propTypes = {
        checklistItem: PropTypes.object.isRequired,
        applicableState: PropTypes.object.isRequired,
        completionDateAction: PropTypes.string,
        undoAction: PropTypes.string,
        reloadCallback: PropTypes.func,
        style: PropTypes.object,
        editable: PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
        this.completeChecklistItem = this.completeChecklistItem.bind(this);
    }

    completeChecklistItem(checklistItem) {
        return () => {
            if (this.props.checklistItem.editable)
                CHSNavigator.navigateToChecklistItemView(this, checklistItem);
            else
                Alert.alert(this.I18n.t("voidedChecklistItemDetailAlertTitle"), new ObservationsHolder(checklistItem.observations).toString(this.I18n));
        }
    }

    showUndoAlert(checklistItem, reloadCallback) {
        const placeholders = {
            vaccinationName: checklistItem.detail.concept.name
        };
        return () => AvniAlert(this.I18n.t('undoChecklistItemConfirmTitle', placeholders), this.I18n.t('undoChecklistItemConfirmMessage'), () => {
            this.dispatchAction(this.props.undoAction, {checklistItem: checklistItem});
            reloadCallback();
        }, this.I18n, true)
    }

    renderUndoAction(checklistItem, reloadCallback) {
        return (
            <View>
            <TouchableHighlight style={this.appendedStyle({
                borderWidth: 0,
                borderColor: 'rgba(97, 97, 97, 0.20)',
                borderRadius: 4,
                padding: 0,
                margin: 2,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 1.5,
                alignSelf: 'center'
            })} onPress={this.showUndoAlert(checklistItem)}>
                <Text style={{ fontSize: Fonts.Normal, color: Colors.NegativeActionButtonColor }}
                      onPress={this.showUndoAlert(checklistItem, reloadCallback)}>{this.I18n.t('Undo')}</Text>
            </TouchableHighlight>
            </View>
        )
    }

    render() {
        const status = this.props.applicableState.status;
        const backgroundColor = status.color;
        const statusText = status.state;
        const maxDateText = General.toDisplayDate(this.props.applicableState.statusDate);
        return (
            <View>
            <TouchableHighlight style={this.appendedStyle({
                borderWidth: 2,
                borderColor: 'rgba(97, 97, 97, 0.20)',
                borderRadius: 4,
                backgroundColor: backgroundColor,
                padding: 6,
                margin: 4,
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 1.5
            })} onPress={this.completeChecklistItem(this.props.checklistItem)}>
                <View style={{flexDirection: 'column', alignItems: 'center'}}>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{this.I18n.t(this.props.checklistItem.detail.concept.name)}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{this.I18n.t(_.startCase(statusText))}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{maxDateText}</Text>
                </View>
            </TouchableHighlight>
            {statusText === 'Completed' && this.renderUndoAction(this.props.checklistItem, this.props.reloadCallback)}
            </View>
        );
    }
}

export default ChecklistItemDisplay;
