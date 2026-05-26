import React from "react";
import {InteractionManager, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import ActionSelector from "../common/ActionSelector";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Reducers from "../../reducer";
import {DidntHappenActions} from "../../action/attendance/DidntHappenActions";
import SessionShareService from "../../service/attendance/SessionShareService";
import CHSNavigator from "../../utility/CHSNavigator";

@Path("/didntHappenPickerView")
class DidntHappenPickerView extends AbstractComponent {
    static propTypes = {
        groupSubject: PropTypes.object.isRequired,
        attendanceType: PropTypes.object.isRequired,
        // Canonical "YYYY-MM-DD" — the attendance flow is time/timezone agnostic.
        scheduledDate: PropTypes.string.isRequired,
        onActionCompletion: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.attendanceDidntHappen);
        this._saveInFlight = false;
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(DidntHappenActions.Names.ON_LOAD, {
            groupSubject: this.props.groupSubject,
            attendanceType: this.props.attendanceType,
            scheduledDate: this.props.scheduledDate,
        });
        super.UNSAFE_componentWillMount();
    }

    _onSetNotes = (notes) => this.dispatchAction(DidntHappenActions.Names.SET_NOTES, {notes});

    _onPickReason = () => this.setState({reasonPickerVisible: true});
    _hideReasonPicker = () => this.setState({reasonPickerVisible: false});

    _reasonActions() {
        return (this.state.reasonAnswers || []).map(a => ({
            label: a.name,
            fn: () => {
                this.dispatchAction(DidntHappenActions.Names.SET_REASON, {reasonConceptUUID: a.uuid});
                this._hideReasonPicker();
            },
        }));
    }

    _selectedReasonName() {
        const {reasonConceptUUID, reasonAnswers} = this.state;
        if (!reasonConceptUUID) return this.I18n.t("selectReason");
        const match = (reasonAnswers || []).find(a => a.uuid === reasonConceptUUID);
        return match ? match.name : this.I18n.t("selectReason");
    }

    _onSave = () => {
        if (!this.state.reasonConceptUUID) return;
        if (this._saveInFlight) return;
        this._saveInFlight = true;
        this.dispatchAction(DidntHappenActions.Names.SAVE);
        const fresh = this.getContextState(Reducers.reducerKeys.attendanceDidntHappen);
        const wi = fresh && fresh.pendingAutoShareWorkItem;
        const shareService = wi ? this.getService(SessionShareService) : null;
        // Deep-link routes per onActionCompletion; normal flow just pops back to the sheet.
        if (this.props.onActionCompletion) {
            CHSNavigator.navigateAfterMarkAttendance(this, this.props.groupSubject, this.props.onActionCompletion);
        } else {
            TypedTransition.from(this).goBack();
        }
        if (wi && shareService) {
            InteractionManager.runAfterInteractions(() => {
                shareService.dispatchShareSessionWorkItem(wi);
            });
        }
    };

    _onCancel = () => TypedTransition.from(this).goBack();

    render() {
        const {groupSubject, attendanceType, scheduledDate} = this.props;
        const {reasonConceptUUID, notes} = this.state;
        const subline = moment.utc(scheduledDate, "YYYY-MM-DD").format("ddd D MMM") + " · " + groupSubject.nameString;
        const canSave = !!reasonConceptUUID;

        return (
            <CHSContainer>
                <AppHeader title={attendanceType.name + " — " + this.I18n.t("didntHappenViewTitle")} subTitle={subline}/>
                <CHSContent>
                    <ScrollView style={{padding: 16}}>
                        <Text style={styles.helpText}>{this.I18n.t("didntHappenWhenToUse")}</Text>

                        <Text style={styles.fieldLabel}>{this.I18n.t("reasonRequired")}</Text>
                        <TouchableOpacity onPress={this._onPickReason} style={styles.picker}>
                            <Text style={styles.pickerText}>{this._selectedReasonName()}</Text>
                            <Text style={styles.pickerChevron}>▾</Text>
                        </TouchableOpacity>

                        <Text style={styles.fieldLabel}>{this.I18n.t("notesOptional")}</Text>
                        <TextInput
                            value={notes || ""}
                            onChangeText={this._onSetNotes}
                            multiline
                            style={styles.notesInput}
                        />

                        <View style={styles.actions}>
                            <TouchableOpacity onPress={this._onCancel} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>{this.I18n.t("confirmCancel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={this._onSave}
                                disabled={!canSave}
                                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}>
                                <Text style={styles.saveText}>{this.I18n.t("saveButton")}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                    <ActionSelector
                        title={this.I18n.t("reasonRequired")}
                        visible={!!this.state.reasonPickerVisible}
                        hide={this._hideReasonPicker}
                        actions={this._reasonActions()}
                    />
                </CHSContent>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    helpText: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginBottom: 20},
    fieldLabel: {fontSize: 11, color: Colors.SubheaderColor || '#666', letterSpacing: 0.5, marginTop: 12, marginBottom: 4},
    picker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    pickerText: {flex: 1, fontSize: Styles.normalTextSize, color: Colors.InputNormal},
    pickerChevron: {fontSize: 16, color: Colors.SubheaderColor || '#666'},
    notesInput: {
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        borderRadius: 4,
        padding: 8,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    actions: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 28},
    cancelBtn: {paddingVertical: 10, paddingHorizontal: 16},
    cancelText: {color: Colors.SubheaderColor || '#666', fontSize: Styles.normalTextSize},
    saveBtn: {
        backgroundColor: Colors.ActionButtonColor,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 4,
    },
    saveBtnDisabled: {backgroundColor: Colors.DisabledButtonColor || '#c2c5c6'},
    saveText: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold', fontSize: Styles.normalTextSize},
});

export default DidntHappenPickerView;
