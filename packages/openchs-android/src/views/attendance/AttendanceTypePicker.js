import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import _ from "lodash";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import ContextActionButton from "../primitives/ContextActionButton";
import Icon from "react-native-vector-icons/SimpleLineIcons";
import {AttendanceRecord, Session} from "avni-models";
import AttendanceRecordService from "../../service/AttendanceRecordService";
import IndividualService from "../../service/IndividualService";
import ConceptService from "../../service/ConceptService";

class AttendanceTypePicker extends AbstractComponent {
    static propTypes = {
        attendanceTypes: PropTypes.array.isRequired,
        // Map<typeUuid, { session, presentCount, totalCount, reasonName }>
        sessionByType: PropTypes.object.isRequired,
        // When false the date is outside the edit window: only the read-only
        // view / share is offered, no Mark / Edit / Didn't-Happen / Void.
        editable: PropTypes.bool,
        onMark: PropTypes.func.isRequired,
        onDidntHappen: PropTypes.func.isRequired,
        onEdit: PropTypes.func.isRequired,
        onShare: PropTypes.func.isRequired,
        onVoid: PropTypes.func.isRequired,
    };

    static defaultProps = {editable: true};

    constructor(props, context) {
        super(props, context);
        this.state = {expanded: {}, rosters: {}};
    }

    _toggleExpand = (attendanceType, session) => {
        const uuid = attendanceType.uuid;
        const willExpand = !this.state.expanded[uuid];
        const rosters = {...this.state.rosters};
        // Load fresh on each open so an edit made since the last view is reflected.
        if (willExpand) rosters[uuid] = this._loadRoster(session);
        this.setState({expanded: {...this.state.expanded, [uuid]: willExpand}, rosters});
    };

    _loadRoster(session) {
        if (!session || session.status !== Session.status.HELD) return [];
        const recordService = this.getService(AttendanceRecordService);
        const individualService = this.getService(IndividualService);
        const conceptService = this.getService(ConceptService);
        return recordService.findBySession(session.uuid)
            .map(r => {
                const subject = individualService.findByUUID(r.subjectUUID);
                return {
                    uuid: r.subjectUUID,
                    name: subject ? subject.nameString : "",
                    present: r.status === AttendanceRecord.status.PRESENT,
                    reasonName: r.reasonConceptUUID
                        ? _.get(conceptService.getConceptByUUID(r.reasonConceptUUID), "name", "")
                        : "",
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    _renderRosterRow = (row) => (
        <View key={row.uuid} style={styles.rosterRow}>
            <Text style={styles.rosterName}>{row.name}</Text>
            {row.present
                ? <Text style={styles.rosterPresent}>{this.I18n.t("present")}</Text>
                : (
                    <Text style={styles.rosterAbsent}>
                        {this.I18n.t("absent")}{row.reasonName ? " · " + row.reasonName : ""}
                    </Text>
                )}
        </View>
    );

    _renderRow = (attendanceType) => {
        const {editable} = this.props;
        const info = this.props.sessionByType.get(attendanceType.uuid) || {session: null};
        const {session} = info;
        const isHeld = session && session.status === Session.status.HELD;
        const isDidntHappen = session && session.status === Session.status.DIDNT_HAPPEN;
        const expanded = !!this.state.expanded[attendanceType.uuid];
        const roster = this.state.rosters[attendanceType.uuid] || [];

        return (
            <View key={attendanceType.uuid}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={!isHeld}
                    onPress={() => this._toggleExpand(attendanceType, session)}
                    style={styles.row}>
                    <View style={{flex: 1}}>
                        <Text style={styles.typeName}>{attendanceType.name}</Text>
                        {!session && (
                            <Text style={styles.statusMuted}>{this.I18n.t("typeRowNotMarked")}</Text>
                        )}
                        {isHeld && (
                            <Text style={styles.statusHeld}>
                                ✓ {this.I18n.t("typeRowHeldSummary", {present: info.presentCount, total: info.totalCount})}
                            </Text>
                        )}
                        {isDidntHappen && (
                            <Text style={styles.statusDidntHappen}>
                                ⊘ {this.I18n.t("typeRowDidntHappenReason", {reason: info.reasonName || ""})}
                            </Text>
                        )}
                    </View>
                    <View style={styles.actions}>
                        {!session && editable && (
                            <>
                                <TouchableOpacity onPress={() => this.props.onMark(attendanceType)} style={styles.primaryBtn}>
                                    <Text style={styles.primaryBtnText}>{this.I18n.t("typeRowMark")}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => this.props.onDidntHappen(attendanceType)} style={styles.secondaryBtn}>
                                    <Text style={styles.secondaryBtnText}>{this.I18n.t("typeRowDidntHappen")}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {session && (
                            <View style={styles.savedActions}>
                                {editable && (
                                    <ContextActionButton
                                        labelKey="void"
                                        onPress={() => this.props.onVoid(attendanceType, session)}
                                        textColor={Colors.CancelledVisitColor}
                                    />
                                )}
                                {editable && (
                                    <ContextActionButton
                                        labelKey="edit"
                                        onPress={() => this.props.onEdit(attendanceType, session)}
                                    />
                                )}
                                <ContextActionButton
                                    labelKey="share"
                                    onPress={() => this.props.onShare(attendanceType, session)}
                                />
                                {isHeld && (
                                    <TouchableOpacity
                                        onPress={() => this._toggleExpand(attendanceType, session)}
                                        style={styles.viewToggle}
                                        accessibilityLabel={this.I18n.t("typeRowView")}>
                                        <Icon name={expanded ? "arrow-up" : "arrow-down"} size={12} color={Colors.ActionButtonColor}/>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                {expanded && isHeld && (
                    <View style={styles.expandPanel}>
                        {roster.length === 0
                            ? <Text style={styles.rosterEmpty}>{this.I18n.t("typeRowNoRecords")}</Text>
                            : roster.map(this._renderRosterRow)}
                    </View>
                )}
            </View>
        );
    };

    render() {
        return (
            <View style={styles.container}>
                {this.props.attendanceTypes.map(this._renderRow)}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {paddingVertical: 4},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        // Matches ContextActionButton's chip backgroundColor (#f6f6f6) so the
        // grey-chip Void / Edit / Share buttons blend into the row instead of
        // looking like floating islands on white — same surface treatment as
        // SubjectDashboardProfileTab's observation sections.
        backgroundColor: Styles.greyBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    typeName: {fontSize: Styles.normalTextSize, fontWeight: 'bold', color: Colors.InputNormal},
    statusMuted: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginTop: 4},
    statusHeld: {fontSize: Styles.smallTextSize, color: Colors.ActionButtonColor, marginTop: 4},
    statusDidntHappen: {fontSize: Styles.smallTextSize, color: '#9e9e9e', marginTop: 4},
    actions: {flexDirection: 'column', alignItems: 'flex-end'},
    primaryBtn: {paddingVertical: 6, paddingHorizontal: 8},
    primaryBtnText: {color: Colors.ActionButtonColor, fontSize: Styles.smallTextSize},
    secondaryBtn: {paddingVertical: 4, paddingHorizontal: 8},
    secondaryBtnText: {color: Colors.SubheaderColor || '#666', fontSize: Styles.smallTextSize},
    savedActions: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'},
    viewToggle: {paddingVertical: 6, paddingHorizontal: 8},
    expandPanel: {
        backgroundColor: Colors.GreyContentBackground,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    rosterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    rosterName: {flex: 1, fontSize: Styles.smallTextSize, color: Colors.InputNormal},
    rosterPresent: {fontSize: Styles.smallTextSize, color: Colors.ActionButtonColor},
    rosterAbsent: {fontSize: Styles.smallTextSize, color: '#9e9e9e', flexShrink: 1, textAlign: 'right'},
    rosterEmpty: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', fontStyle: 'italic'},
});

export default AttendanceTypePicker;
