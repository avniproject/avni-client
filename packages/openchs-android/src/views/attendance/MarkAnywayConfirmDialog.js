import React from "react";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import moment from "moment";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import AvniIcon from "../common/AvniIcon";

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
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{this.I18n.t("markAnywayConfirmTitle")}</Text>
                            <TouchableOpacity onPress={onCancel} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.body}>
                            {this.I18n.t("markAnywayConfirmBody", {date: dateLabel})}
                        </Text>
                        <View style={styles.actions}>
                            {/* Continuing skips a warning, so it's the de-emphasized outlined option; Cancel
                                (the cautious default) gets the filled/prominent button. */}
                            <TouchableOpacity onPress={onContinue} style={[styles.btn, styles.secondaryBtn]}>
                                <Text style={styles.continueText}>{this.I18n.t("confirmContinue")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.primaryBtn]}>
                                <Text style={styles.cancelText}>{this.I18n.t("confirmCancel")}</Text>
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
    dialog: {width: '100%', maxWidth: 320, backgroundColor: Colors.WhiteContentBackground, borderRadius: 16, borderWidth: 1, borderColor: Colors.BrandPrimary, padding: 20, overflow: 'hidden'},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: (Styles.titleSize || 18) + 2, fontWeight: '500', color: Colors.BrandPrimary},
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    body: {fontSize: Styles.normalTextSize, color: Colors.TextSecondary, marginTop: 16, marginBottom: 24},
    actions: {flexDirection: 'row', justifyContent: 'space-between'},
    btn: {flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    secondaryBtn: {backgroundColor: Colors.WhiteContentBackground, borderWidth: 1, borderColor: Colors.BrandPrimary, marginRight: 8},
    primaryBtn: {backgroundColor: Colors.BrandPrimaryDark, marginLeft: 8},
    continueText: {color: Colors.BrandPrimary, fontWeight: '600'},
    cancelText: {color: Colors.TextOnPrimaryColor, fontWeight: '600'},
});

export default MarkAnywayConfirmDialog;
