import React from "react";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

class MarkAnywayConfirmDialog extends AbstractComponent {
    static propTypes = {
        visible: PropTypes.bool.isRequired,
        // Canonical "YYYY-MM-DD" — the attendance flow is time/timezone agnostic.
        date: PropTypes.string,
        onCancel: PropTypes.func.isRequired,
        onContinue: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const {visible, date, onCancel, onContinue} = this.props;
        const dateLabel = date ? moment.utc(date, "YYYY-MM-DD").format("ddd D MMM YYYY") : "";
        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <Text style={styles.title}>{this.I18n.t("markAnywayConfirmTitle")}</Text>
                        <Text style={styles.body}>
                            {this.I18n.t("markAnywayConfirmBody", {date: dateLabel})}
                        </Text>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onCancel} style={styles.btn}>
                                <Text style={styles.cancelText}>{this.I18n.t("confirmCancel")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onContinue} style={styles.btn}>
                                <Text style={styles.continueText}>{this.I18n.t("confirmContinue")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}

const styles = StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24},
    dialog: {width: '100%', backgroundColor: Colors.WhiteContentBackground, borderRadius: 8, padding: 20},
    title: {fontSize: Styles.titleSize || 18, fontWeight: 'bold', color: Colors.InputNormal, marginBottom: 12},
    body: {fontSize: Styles.normalTextSize, color: Colors.InputNormal, marginBottom: 20},
    actions: {flexDirection: 'row', justifyContent: 'flex-end'},
    btn: {paddingVertical: 8, paddingHorizontal: 16},
    cancelText: {color: Colors.SubheaderColor || '#666', fontWeight: 'bold'},
    continueText: {color: Colors.ActionButtonColor, fontWeight: 'bold'},
});

export default MarkAnywayConfirmDialog;
