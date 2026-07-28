import React from "react";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import AvniIcon from "./AvniIcon";

class RemoveMediaConfirmDialog extends AbstractComponent {
    static propTypes = {
        visible: PropTypes.bool.isRequired,
        onCancel: PropTypes.func.isRequired,
        onConfirm: PropTypes.func.isRequired,
    };

    render() {
        const {visible, onCancel, onConfirm} = this.props;
        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{this.I18n.t('removeImageConfirmTitle')}</Text>
                            <TouchableOpacity onPress={onCancel} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.body}>{this.I18n.t('removeImageConfirmBody')}</Text>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onConfirm} style={[styles.btn, styles.secondaryBtn]}>
                                <Text style={styles.secondaryText}>{this.I18n.t('yes')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.primaryBtn]}>
                                <Text style={styles.primaryText}>{this.I18n.t('no')}</Text>
                            </TouchableOpacity>
                        </View>
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
        paddingHorizontal: 24
    },
    dialog: {width: '100%', maxWidth: 320, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: Colors.BrandPrimary, padding: 16, overflow: 'hidden'},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: Styles.normalTextSize + 2, fontWeight: '500', color: Colors.BrandPrimary},
    closeIcon: {fontSize: 20, color: Colors.SecondaryText},
    body: {fontSize: Styles.normalTextSize, color: Colors.TextHint, marginTop: 16, marginBottom: 24},
    actions: {flexDirection: 'row', justifyContent: 'space-between'},
    btn: {flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    secondaryBtn: {backgroundColor: '#ffffff', borderWidth: 1, borderColor: Colors.BrandPrimary, marginRight: 8},
    secondaryText: {color: Colors.BrandPrimary, fontWeight: '600'},
    primaryBtn: {backgroundColor: Colors.BrandPrimaryDark, marginLeft: 8},
    primaryText: {color: '#ffffff', fontWeight: '600'},
});

export default RemoveMediaConfirmDialog;
