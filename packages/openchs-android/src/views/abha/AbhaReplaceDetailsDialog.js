import React from "react";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

// When an ABHA is found for a patient being edited: their current name, gender and date of birth beside the ABHA's,
// before anything is changed. Also, with its own title and action, when the ABHA already belongs to another patient:
// that patient's details beside the ABHA's, before their record opens.
class AbhaReplaceDetailsDialog extends AbstractComponent {
    static propTypes = {
        rows: PropTypes.arrayOf(PropTypes.shape({label: PropTypes.string, current: PropTypes.string, abha: PropTypes.string})).isRequired,
        onApply: PropTypes.func.isRequired,
        onCancel: PropTypes.func.isRequired,
        title: PropTypes.string,
        applyLabel: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderRow(label, current, abha, style, key) {
        return (
            <View style={styles.row} key={key}>
                <Text style={[styles.label, style]}>{label}</Text>
                <Text style={[styles.cell, style]}>{current}</Text>
                <Text style={[styles.cell, style]}>{abha}</Text>
            </View>
        );
    }

    render() {
        const {rows, onApply, onCancel, title = this.I18n.t('abhaReplaceDetails'), applyLabel = 'apply'} = this.props;
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <Text style={styles.title}>{title}</Text>
                        {this.renderRow('', this.I18n.t('abhaCurrentDetails'), this.I18n.t('abhaProfileDetails'), styles.heading, 'heading')}
                        {rows.map(({label, current, abha}) => this.renderRow(label, current, abha, null, label))}
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onCancel} style={styles.btn}>
                                <Text style={styles.cancelText}>{this.I18n.t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onApply} style={styles.btn}>
                                <Text style={styles.applyText}>{this.I18n.t(applyLabel)}</Text>
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
    title: {fontSize: Styles.normalTextSize, fontWeight: 'bold', color: Colors.InputNormal, marginBottom: 12},
    row: {flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.InputBorderNormal},
    label: {flex: 2, fontSize: Styles.smallTextSize, color: Colors.InputNormal},
    cell: {flex: 3, fontSize: Styles.smallTextSize, color: Colors.InputNormal, paddingLeft: 8},
    heading: {fontWeight: 'bold'},
    actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16},
    btn: {paddingVertical: 8, paddingHorizontal: 16},
    cancelText: {color: Colors.DefaultPrimaryColor, fontWeight: 'bold'},
    applyText: {color: Colors.ActionButtonColor, fontWeight: 'bold'},
});

export default AbhaReplaceDetailsDialog;
