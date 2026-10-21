import React from "react";
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import PropTypes from "prop-types";
import Icon from "react-native-vector-icons/MaterialIcons";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

// The organisation's own consent wording, shown before Eka's screens. Continue stays off until the patient's
// agreement is ticked; the time of the tick goes into the ABHA audit record. Back closes it without an answer: only
// "Does not agree" says the patient declined.
class AbhaConsentDialog extends AbstractComponent {
    static propTypes = {
        text: PropTypes.string.isRequired,
        onContinue: PropTypes.func.isRequired,
        onDecline: PropTypes.func.isRequired,
        onCancel: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {agreedAt: null};
    }

    render() {
        const {text, onContinue, onDecline, onCancel} = this.props;
        const {agreedAt} = this.state;
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <ScrollView style={styles.textBox}>
                            <Text style={styles.body}>{text}</Text>
                        </ScrollView>
                        <TouchableOpacity style={styles.agree} onPress={() => this.setState({agreedAt: agreedAt ? null : new Date()})}>
                            <Icon name={agreedAt ? 'check-box' : 'check-box-outline-blank'} size={24} color={Colors.ActionButtonColor}/>
                            <Text style={styles.agreeText}>{this.I18n.t('abhaConsentAgree')}</Text>
                        </TouchableOpacity>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={onDecline} style={styles.btn}>
                                <Text style={styles.declineText}>{this.I18n.t('abhaConsentDecline')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => agreedAt && onContinue(agreedAt)} disabled={!agreedAt} style={styles.btn}>
                                <Text style={{fontWeight: 'bold', color: agreedAt ? Colors.ActionButtonColor : Colors.DisabledButtonColor}}>
                                    {this.I18n.t('abhaConsentContinue')}
                                </Text>
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
    dialog: {width: '100%', maxHeight: '90%', backgroundColor: Colors.WhiteContentBackground, borderRadius: 8, padding: 20},
    textBox: {marginBottom: 16},
    body: {fontSize: Styles.normalTextSize, color: Colors.InputNormal},
    agree: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
    agreeText: {fontSize: Styles.normalTextSize, color: Colors.InputNormal, marginLeft: 8, flex: 1},
    actions: {flexDirection: 'row', justifyContent: 'flex-end'},
    btn: {paddingVertical: 8, paddingHorizontal: 16},
    declineText: {color: Colors.DefaultPrimaryColor, fontWeight: 'bold'},
});

export default AbhaConsentDialog;
