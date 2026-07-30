import React from "react";
import {Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import AvniIcon from "./AvniIcon";
import _ from "lodash";

// Two side-by-side buttons split the row 50/50 by default, which wastes space next to a short
// label ("Cancel") while cramping a long one ("Delete data and login") into extra text wrapping.
// Weighting each button's flex by its label length instead lets the long-text button claim the
// room it needs; the floor/ceiling keep either side from becoming a sliver or swallowing the row.
const BUTTON_FLEX_MIN = 6;
const BUTTON_FLEX_MAX = 40;
const flexWeightForLabel = (label) => Math.min(Math.max((label || '').length, BUTTON_FLEX_MIN), BUTTON_FLEX_MAX);

// Singleton host mounted once at the app root (see App.js) so AvniAlert/AsyncAlert can trigger
// this on-brand rounded dialog imperatively, the same way they called the native Alert.alert
// before - callers don't need to render/own a Modal themselves.
class CustomConfirmDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {visible: false, title: "", message: "", yesLabel: "Yes", noLabel: "No", onYes: null, onNo: null, singleButton: false, actions: null};
    }

    componentDidMount() {
        CustomConfirmDialog.instance = this;
    }

    componentWillUnmount() {
        if (CustomConfirmDialog.instance === this) CustomConfirmDialog.instance = null;
    }

    static show({title, message, yesLabel = "Yes", noLabel = "No", onYes, onNo}) {
        if (CustomConfirmDialog.instance) {
            CustomConfirmDialog.instance.setState({visible: true, title, message, yesLabel, noLabel, onYes, onNo, singleButton: false, actions: null});
        }
    }

    // Single-action variant for informational alerts (e.g. "Sync Required") that previously used
    // the native Alert.alert - keeps the same on-brand dialog chrome as the Yes/No confirm above,
    // just with one full-width button instead of two.
    static showAlert({title, message, okLabel = "Okay", onOk}) {
        if (CustomConfirmDialog.instance) {
            CustomConfirmDialog.instance.setState({visible: true, title, message, yesLabel: okLabel, noLabel: null, onYes: onOk, onNo: onOk, singleButton: true, actions: null});
        }
    }

    // N-button variant (e.g. error dialogs with Close/Restart/Upload issue info) that previously
    // used the native Alert.alert's button array - same on-brand chrome, buttons stacked full-width
    // instead of the 2-across row, since 3+ buttons don't fit side by side. `actions` is
    // [{label, onPress, primary}], first `primary: true` action renders filled/dark, the rest
    // outlined - matches the "safe default is emphasized" convention used by show()/showAlert().
    static showActions({title, message, actions}) {
        if (CustomConfirmDialog.instance) {
            CustomConfirmDialog.instance.setState({visible: true, title, message, actions, onNo: null});
        }
    }

    close = () => this.setState({visible: false});

    handleYes = () => {
        const {onYes} = this.state;
        this.close();
        onYes && onYes();
    };

    handleNo = () => {
        const {onNo} = this.state;
        this.close();
        onNo && onNo();
    };

    handleAction = (onPress) => () => {
        this.close();
        onPress && onPress();
    };

    renderActionButtons() {
        const {actions} = this.state;
        const firstPrimaryIndex = actions.findIndex(a => a.primary);
        return actions.map((action, index) => (
            <TouchableOpacity key={index} onPress={this.handleAction(action.onPress)}
                               style={[styles.btn, styles.fullWidthBtn, index === firstPrimaryIndex ? styles.primaryBtn : styles.secondaryBtn, index > 0 && styles.stackedBtnSpacing]}>
                <Text style={index === firstPrimaryIndex ? styles.primaryText : styles.secondaryText}>{action.label}</Text>
            </TouchableOpacity>
        ));
    }

    render() {
        const {visible, title, message, yesLabel, noLabel, singleButton, actions} = this.state;
        const hasActions = !_.isNil(actions);
        return (
            <Modal visible={visible} transparent animationType="fade" onRequestClose={this.handleNo}>
                <View style={styles.backdrop}>
                    <View style={styles.dialog}>
                        <View style={styles.titleRow}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity onPress={this.handleNo} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <AvniIcon type="MaterialIcons" name="close" style={styles.closeIcon}/>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.bodyScroll}>
                            <Text style={styles.body}>{message}</Text>
                        </ScrollView>
                        <View style={hasActions ? styles.actionsStacked : styles.actions}>
                            {hasActions ?
                                this.renderActionButtons()
                                : singleButton ?
                                    <TouchableOpacity onPress={this.handleYes} style={[styles.btn, styles.primaryBtn, styles.fullWidthBtn]}>
                                        <Text style={styles.primaryText}>{yesLabel}</Text>
                                    </TouchableOpacity>
                                    : <React.Fragment>
                                        <TouchableOpacity onPress={this.handleYes} style={[styles.btn, styles.secondaryBtn, {flex: flexWeightForLabel(yesLabel)}]}>
                                            <Text style={styles.secondaryText} numberOfLines={2}>{yesLabel}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={this.handleNo} style={[styles.btn, styles.primaryBtn, {flex: flexWeightForLabel(noLabel)}]}>
                                            <Text style={styles.primaryText} numberOfLines={2}>{noLabel}</Text>
                                        </TouchableOpacity>
                                    </React.Fragment>}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}

CustomConfirmDialog.instance = null;

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24
    },
    dialog: {width: '100%', maxWidth: 320, maxHeight: '80%', backgroundColor: Colors.WhiteContentBackground, borderRadius: 16, borderWidth: 1, borderColor: Colors.BrandPrimary, padding: 16, overflow: 'hidden'},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: (Styles.titleSize || 18) + 2, fontWeight: '500', color: Colors.BrandPrimary},
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    // Error dialogs (showActions) can carry long stack traces - capping and scrolling the body
    // keeps the dialog itself from growing past the screen on small devices.
    bodyScroll: {marginTop: 16, marginBottom: 24, flexGrow: 0},
    body: {fontSize: Styles.normalTextSize, color: Colors.TextSecondary},
    actions: {flexDirection: 'row', justifyContent: 'space-between'},
    actionsStacked: {flexDirection: 'column'},
    btn: {flex: 1, minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 8},
    fullWidthBtn: {marginLeft: 0, marginRight: 0},
    stackedBtnSpacing: {marginTop: 8},
    secondaryBtn: {backgroundColor: Colors.WhiteContentBackground, borderWidth: 1, borderColor: Colors.BrandPrimary, marginRight: 8},
    secondaryText: {color: Colors.BrandPrimary, fontWeight: '600', textAlign: 'center'},
    primaryBtn: {backgroundColor: Colors.BrandPrimaryDark, marginLeft: 8},
    primaryText: {color: Colors.TextOnPrimaryColor, fontWeight: '600', textAlign: 'center'},
});

export default CustomConfirmDialog;
