import React from "react";
import PropTypes from "prop-types";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Icon from "react-native-vector-icons/MaterialIcons";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";

class FormShareActionSheet extends AbstractComponent {
    static propTypes = {
        visible: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        onSharePdf: PropTypes.func.isRequired,
        onShareText: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    _row(iconName, labelKey, onPress) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() => {
                    this.props.onClose();
                    onPress();
                }}
            >
                <Icon name={iconName} size={28} color={Colors.ActionButtonColor}/>
                <Text style={styles.rowLabel}>{this.I18n.t(labelKey)}</Text>
            </TouchableOpacity>
        );
    }

    render() {
        return (
            <Modal
                animationType="slide"
                transparent
                visible={this.props.visible}
                onRequestClose={this.props.onClose}
            >
                <TouchableWithoutFeedback onPress={this.props.onClose}>
                    <View style={styles.backdrop}>
                        <TouchableWithoutFeedback>
                            <View style={styles.sheet}>
                                <View style={styles.handle}/>
                                <Text style={styles.title}>{this.I18n.t("share")}</Text>
                                {this._row("picture-as-pdf", "formShare.asPdf", this.props.onSharePdf)}
                                {this._row("message", "formShare.asText", this.props.onShareText)}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    }
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
    },
    sheet: {
        backgroundColor: Styles.whiteColor,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 8,
        paddingBottom: 24,
        paddingHorizontal: 8,
    },
    handle: {
        alignSelf: "center",
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#d0d0d0",
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: Styles.blackColor,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowLabel: {
        marginLeft: 16,
        fontSize: 16,
        color: Styles.blackColor,
    },
});

export default FormShareActionSheet;
