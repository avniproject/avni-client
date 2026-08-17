import {
    Modal,
    Text,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    View,
    ScrollView
} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MCIIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Styles from "../primitives/Styles";
import _ from "lodash";
import Colors from "../primitives/Colors";
import AvniIcon from "./AvniIcon";

// Bottom-sheet style instead of a small centered card - the old layout capped the card at 55%
// height and top-aligned it, leaving most of the screen below as dead, unused overlay space.
const styles = {
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: 'flex-end'
    },
    sheet: {
        width: '100%',
        maxHeight: '85%',
        backgroundColor: Colors.WhiteContentBackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 28
    },
    dragHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.BorderDefault,
        marginBottom: 12
    },
    closeIcon: {
        position: 'absolute',
        top: 12,
        right: 16,
        zIndex: 1,
        padding: 4
    },
    heading: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.TextPrimaryDark,
        paddingRight: 32,
        marginBottom: 16
    }
};

class ActionSelector extends AbstractComponent {

    static propTypes = {
        actions: PropTypes.array.isRequired,
        visible: PropTypes.bool.isRequired,
        hide: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired
    };

    static defaultProps = {
        actions: [],
        visible: false
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <Modal
                animationType={"slide"}
                transparent={true}
                visible={this.props.visible}
                onRequestClose={() => this.props.hide()}
            >
                <TouchableWithoutFeedback onPress={() => this.props.hide()}>
                    <View style={styles.overlay}>
                        {this.contentContainer()}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        );
    }

    contentContainer() {
        // Swallows the tap so touches inside the sheet don't bubble up to the overlay's
        // dismiss-on-press-outside handler.
        return (
            <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.sheet}>
                    <View style={styles.dragHandle}/>
                    {this.closeButton()}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {this.heading()}
                        {this.actionButtons()}
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    closeButton() {
        return (
            <TouchableWithoutFeedback onPress={() => this.props.hide()}>
                <View style={styles.closeIcon}>
                    <MCIIcon name={'close'} style={{fontSize: 24, color: Colors.TextSecondary}}/>
                </View>
            </TouchableWithoutFeedback>
        );
    }

    heading() {
        if (!this.props.title || this.props.title.trim() === '') {
            return null;
        }
        return (
            <View>
                <Text style={styles.heading}>{this.props.title}</Text>
            </View>
        );
    }

    actionButtons() {
        return _.map(this.props.actions, (action, key) =>
            this.actionButton(
                action.fn,
                // BrandPrimaryDark matches the Next/primary button colour (WizardButtons) - was
                // ActionButtonColor, a leftover pre-rebrand teal that reads as a different shade.
                action.backgroundColor || Colors.BrandPrimaryDark,
                action.label,
                Colors.TextOnPrimaryColor,
                action.icon,
                key
            )
        )
    }

    actionButton(onPress, buttonColor, text, textColor, icon, index) {
        // Icon menus keep the icon left-aligned with the label filling the rest;
        // icon-less menus (e.g. the reason pickers) center the label — flexWrap on
        // basicPrimaryButtonView otherwise defeats the label's flex and it sits left.
        const hasIcon = !!icon;
        return (
            <View key={index} style={{paddingTop: 10}}>
                <TouchableNativeFeedback onPress={() => {
                    this.props.hide();
                    onPress();
                }}>
                    <View style={[Styles.basicPrimaryButtonView, {
                        flexDirection: 'row',
                        backgroundColor: buttonColor,
                        minHeight: 48,
                        width: '100%',
                        borderRadius: 8,
                        elevation: 0,
                        marginBottom: 0,
                        alignItems: 'center',
                        justifyContent: hasIcon ? 'flex-start' : 'center',
                        paddingLeft: hasIcon ? 15 : 0
                    }]}>
                        {hasIcon && <View style={{width: 50, alignItems: 'center'}}>
                            <AvniIcon name={icon} color={textColor} style={{fontSize: 50}} />
                        </View>}
                        <Text style={{
                            fontSize: 16,
                            color: textColor,
                            textAlign: 'center',
                            paddingVertical: 8,
                            ...(hasIcon ? {flex: 1} : {})
                        }}>{this.I18n.t(text)}</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }
}

export default ActionSelector;
