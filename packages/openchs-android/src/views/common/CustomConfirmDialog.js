import React from "react";
import {Modal, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import AvniIcon from "./AvniIcon";

// Singleton host mounted once at the app root (see App.js) so AvniAlert/AsyncAlert can trigger
// this on-brand rounded dialog imperatively, the same way they called the native Alert.alert
// before - callers don't need to render/own a Modal themselves.
class CustomConfirmDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {visible: false, title: "", message: "", yesLabel: "Yes", noLabel: "No", onYes: null, onNo: null};
    }

    componentDidMount() {
        CustomConfirmDialog.instance = this;
    }

    componentWillUnmount() {
        if (CustomConfirmDialog.instance === this) CustomConfirmDialog.instance = null;
    }

    static show({title, message, yesLabel = "Yes", noLabel = "No", onYes, onNo}) {
        if (CustomConfirmDialog.instance) {
            CustomConfirmDialog.instance.setState({visible: true, title, message, yesLabel, noLabel, onYes, onNo});
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

    render() {
        const {visible, title, message, yesLabel, noLabel} = this.state;
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
                        <Text style={styles.body}>{message}</Text>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={this.handleYes} style={[styles.btn, styles.secondaryBtn]}>
                                <Text style={styles.secondaryText}>{yesLabel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={this.handleNo} style={[styles.btn, styles.primaryBtn]}>
                                <Text style={styles.primaryText}>{noLabel}</Text>
                            </TouchableOpacity>
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
    dialog: {width: '100%', maxWidth: 320, backgroundColor: Colors.WhiteContentBackground, borderRadius: 16, borderWidth: 1, borderColor: Colors.BrandPrimary, padding: 16, overflow: 'hidden'},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: (Styles.titleSize || 18) + 2, fontWeight: '500', color: Colors.BrandPrimary},
    closeIcon: {fontSize: 20, color: Colors.TextSecondary},
    body: {fontSize: Styles.normalTextSize, color: Colors.TextSecondary, marginTop: 16, marginBottom: 24},
    actions: {flexDirection: 'row', justifyContent: 'space-between'},
    btn: {flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    secondaryBtn: {backgroundColor: Colors.WhiteContentBackground, borderWidth: 1, borderColor: Colors.BrandPrimary, marginRight: 8},
    secondaryText: {color: Colors.BrandPrimary, fontWeight: '600'},
    primaryBtn: {backgroundColor: Colors.BrandPrimaryDark, marginLeft: 8},
    primaryText: {color: Colors.TextOnPrimaryColor, fontWeight: '600'},
});

export default CustomConfirmDialog;
