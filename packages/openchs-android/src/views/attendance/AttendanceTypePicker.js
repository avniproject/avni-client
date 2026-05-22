import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import {Session} from "avni-models";

class AttendanceTypePicker extends AbstractComponent {
    static propTypes = {
        attendanceTypes: PropTypes.array.isRequired,
        // Map<typeUuid, { session, presentCount, totalCount, reasonName }>
        sessionByType: PropTypes.object.isRequired,
        onMark: PropTypes.func.isRequired,
        onDidntHappen: PropTypes.func.isRequired,
        onEdit: PropTypes.func.isRequired,
        onOverflow: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    _renderRow = (attendanceType) => {
        const info = this.props.sessionByType.get(attendanceType.uuid) || {session: null};
        const {session} = info;
        const isHeld = session && session.status === Session.status.HELD;
        const isDidntHappen = session && session.status === Session.status.DIDNT_HAPPEN;

        return (
            <View key={attendanceType.uuid} style={styles.row}>
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
                    {!session && (
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
                            <TouchableOpacity onPress={() => this.props.onEdit(attendanceType, session)} style={styles.editLink}>
                                <Text style={styles.editText}>{this.I18n.t("typeRowEdit")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => this.props.onOverflow(attendanceType, session)}
                                style={styles.overflowBtn}
                                accessibilityLabel={this.I18n.t("typeRowOverflowMenu")}>
                                <Text style={styles.overflowText}>⋮</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
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
        backgroundColor: Colors.WhiteContentBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.InputBorderNormal,
    },
    typeName: {fontSize: Styles.normalTextSize, fontWeight: 'bold', color: Colors.InputNormal},
    statusMuted: {fontSize: Styles.smallTextSize, color: Colors.SubheaderColor || '#666', marginTop: 4},
    statusHeld: {fontSize: Styles.smallTextSize, color: Colors.ActionButtonColor, marginTop: 4},
    statusDidntHappen: {fontSize: Styles.smallTextSize, color: '#9e9e9e', marginTop: 4},
    actions: {flexDirection: 'column', alignItems: 'flex-end'},
    primaryBtn: {paddingVertical: 6, paddingHorizontal: 8},
    primaryBtnText: {color: Colors.ActionButtonColor, fontWeight: 'bold', fontSize: Styles.smallTextSize},
    secondaryBtn: {paddingVertical: 4, paddingHorizontal: 8},
    secondaryBtnText: {color: Colors.SubheaderColor || '#666', fontSize: Styles.smallTextSize},
    savedActions: {flexDirection: 'row', alignItems: 'center'},
    editLink: {paddingVertical: 6, paddingHorizontal: 8},
    editText: {color: Colors.ActionButtonColor, fontWeight: 'bold', fontSize: Styles.smallTextSize},
    overflowBtn: {paddingVertical: 6, paddingHorizontal: 8, marginLeft: 4},
    overflowText: {color: Colors.SubheaderColor || '#666', fontSize: 22, fontWeight: 'bold'},
});

export default AttendanceTypePicker;
