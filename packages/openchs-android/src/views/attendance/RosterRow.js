import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import {AttendanceRecord} from "avni-models";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

class RosterRow extends AbstractComponent {
    static propTypes = {
        index: PropTypes.number.isRequired,
        // {subjectUUID, name, status, reasonConceptUUIDs, needsFollowUp}
        row: PropTypes.object.isRequired,
        // [{uuid, name}]
        reasonAnswers: PropTypes.array.isRequired,
        // null if the AttendanceType has no followUpEncounterType (so the
        // checkbox is hidden when no follow-up encounter can be created).
        followUpEncounterTypeUuid: PropTypes.string,
        onToggle: PropTypes.func.isRequired,
        onToggleReason: PropTypes.func.isRequired,
        onToggleNeedsFollowUp: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {row, index, reasonAnswers, followUpEncounterTypeUuid, onToggle, onToggleReason, onToggleNeedsFollowUp} = this.props;
        const isAbsent = row.status === AttendanceRecord.status.ABSENT;
        const showNeedsFollowUp = isAbsent && !!followUpEncounterTypeUuid;
        const checked = !!row.needsFollowUp;
        const selectedReasons = row.reasonConceptUUIDs || [];

        return (
            <View style={styles.row}>
                <TouchableOpacity onPress={() => onToggle(row.subjectUUID)} style={styles.topRow}>
                    <View style={{flex: 1}}>
                        <Text style={styles.name}>{row.name}</Text>
                        <Text style={styles.roll}>#{index + 1}</Text>
                    </View>
                    <View style={[styles.statusChip, isAbsent ? styles.statusAbsent : styles.statusPresent]}>
                        <Text style={[styles.statusText, isAbsent && styles.statusTextAbsent]}>
                            {isAbsent ? this.I18n.t("absent") : this.I18n.t("present")}
                        </Text>
                    </View>
                </TouchableOpacity>
                {isAbsent && (
                    <View style={styles.reasonBlock}>
                        <Text style={styles.reasonLabel}>{this.I18n.t("reasonForAbsence")}</Text>
                        <View style={styles.chipWrap}>
                            {(reasonAnswers || []).map(answer => {
                                const selected = selectedReasons.includes(answer.uuid);
                                return (
                                    <TouchableOpacity
                                        key={answer.uuid}
                                        onPress={() => onToggleReason(row.subjectUUID, answer.uuid)}
                                        style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                                    >
                                        <Text style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>
                                            {answer.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {showNeedsFollowUp && (
                            <TouchableOpacity
                                onPress={() => onToggleNeedsFollowUp(row.subjectUUID)}
                                style={styles.followUpRow}
                            >
                                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                    {checked && <Text style={styles.checkboxTick}>✓</Text>}
                                </View>
                                <Text style={styles.followUpLabel}>{this.I18n.t("needsFollowUp")}</Text>
                                {row.followUpEncounterUUID && (
                                    <View style={styles.scheduledPill}>
                                        <Text style={styles.scheduledPillText}>{this.I18n.t("followUpScheduled")}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    row: {
        backgroundColor: Colors.WhiteContentBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    name: {fontSize: Styles.normalTextSize, color: Colors.InputNormal},
    roll: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginTop: 2},
    statusChip: {paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12},
    statusPresent: {backgroundColor: '#E8F5E9'},
    statusAbsent: {backgroundColor: '#FBE9E7'},
    statusText: {fontSize: Styles.smallTextSize, color: Colors.ActionButtonColor, fontWeight: 'bold'},
    statusTextAbsent: {color: '#E64A19'},
    reasonBlock: {paddingHorizontal: 16, paddingBottom: 12},
    reasonLabel: {fontSize: 11, color: Colors.SubheaderColor || '#666', letterSpacing: 0.5},
    chipWrap: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 6},
    reasonChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        backgroundColor: Colors.WhiteContentBackground,
        marginRight: 8,
        marginBottom: 8,
    },
    reasonChipSelected: {
        backgroundColor: Colors.ActionButtonColor,
        borderColor: Colors.ActionButtonColor,
    },
    reasonChipText: {fontSize: Styles.smallTextSize, color: Colors.InputNormal},
    reasonChipTextSelected: {color: Colors.TextOnPrimaryColor, fontWeight: 'bold'},
    followUpRow: {flexDirection: 'row', alignItems: 'center', marginTop: 10},
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: Colors.SubheaderColor || '#666',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.WhiteContentBackground,
    },
    checkboxChecked: {backgroundColor: Colors.ActionButtonColor, borderColor: Colors.ActionButtonColor},
    checkboxTick: {color: Colors.WhiteContentBackground, fontSize: 14, lineHeight: 16, fontWeight: 'bold'},
    followUpLabel: {fontSize: Styles.normalTextSize, color: Colors.InputNormal, marginLeft: 8},
    scheduledPill: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
    },
    scheduledPillText: {fontSize: Styles.smallTextSize, color: '#1565C0'},
});

export default RosterRow;
