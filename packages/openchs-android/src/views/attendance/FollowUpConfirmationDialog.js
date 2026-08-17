import React from "react";
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import AbstractComponent from "../../framework/view/AbstractComponent";
import IndividualService from "../../service/IndividualService";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import AvniIcon from "../common/AvniIcon";

class FollowUpConfirmationDialog extends AbstractComponent {
    static propTypes = {
        visible: PropTypes.bool.isRequired,
        // {createdFollowUps: [{uuid, encounterTypeName, subjectUUID, earliestVisitDateTime, maxVisitDateTime}],
        //  voidedFollowUpCount: number,
        //  skippedFollowUps: [{uuid}]}
        result: PropTypes.object,
        onDismiss: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    _studentName(subjectUUID) {
        if (!subjectUUID) return "";
        const individual = this.getService(IndividualService).findByUUID(subjectUUID);
        return individual ? individual.nameString : "";
    }

    render() {
        const {visible, result, onDismiss} = this.props;
        if (!result) return null;
        const created = result.createdFollowUps || [];
        const skippedCount = (result.skippedFollowUps || []).length;

        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{this.I18n.t("followUpsCreatedTitle")}</Text>
                            <TouchableOpacity onPress={onDismiss} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.subtitle}>
                            {this.I18n.t("followUpsCreatedSubtitle", {count: created.length})}
                        </Text>
                        <ScrollView style={styles.list}>
                            {created.map((e, i) => (
                                <View key={e.uuid} style={styles.listRow}>
                                    <Text style={styles.studentName}>{this._studentName(e.subjectUUID)}</Text>
                                    <Text style={styles.rollLine}>
                                        {this.I18n.t("followUpRollLine", {
                                            roll: i + 1,
                                            encounterType: e.encounterTypeName,
                                        })}
                                    </Text>
                                    {e.maxVisitDateTime && (
                                        <Text style={styles.maxLine}>
                                            {this.I18n.t("followUpMaxDate", {
                                                date: moment(e.maxVisitDateTime).format("ddd D MMM YYYY"),
                                            })}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                        {skippedCount > 0 && (
                            <Text style={styles.skippedLine}>
                                {this.I18n.t("followUpsKeptCount", {count: skippedCount})}
                            </Text>
                        )}
                        <TouchableOpacity onPress={onDismiss} style={styles.okBtn}>
                            <Text style={styles.okText}>{this.I18n.t("confirmationOk")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialog: {
        width: '100%',
        maxWidth: 340,
        maxHeight: '80%',
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        padding: 20,
        overflow: 'hidden',
    },
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: (Styles.titleSize || 18) + 2, fontWeight: '500', color: Colors.BrandPrimary},
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    subtitle: {fontSize: Styles.smallTextSize, color: Colors.TextSecondary, marginTop: 16, marginBottom: 12},
    list: {maxHeight: 280},
    listRow: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.BorderDefault,
    },
    studentName: {fontSize: Styles.normalTextSize, fontWeight: '600', color: Colors.TextPrimaryDark},
    rollLine: {fontSize: Styles.smallTextSize, color: Colors.TextSecondary, marginTop: 2},
    maxLine: {fontSize: Styles.smallTextSize, color: Colors.TextSecondary, marginTop: 2},
    skippedLine: {fontSize: Styles.smallTextSize, color: '#E65100', marginTop: 12, fontStyle: 'italic'},
    okBtn: {marginTop: 20, height: 48, borderRadius: 8, backgroundColor: Colors.BrandPrimaryDark, alignItems: 'center', justifyContent: 'center'},
    okText: {color: Colors.TextOnPrimaryColor, fontWeight: '600', fontSize: Styles.normalTextSize},
});

export default FollowUpConfirmationDialog;
