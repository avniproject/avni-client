import AbstractComponent from "../../framework/view/AbstractComponent";
import React from "react";
import {Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';
import Colors from "../primitives/Colors";
import {Button, Icon} from 'native-base'
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";

class FloatingActionButton extends AbstractComponent {

    static propTypes = {
        actions: React.PropTypes.array.isRequired,
        primaryAction: React.PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {modalVisible: false};
    }

    setModalVisible(visible, fun = _.noop) {
        this.setState({
            modalVisible: visible,
        }, fun);
    }

    onPress() {
        this.setModalVisible(true)
    }

    reset(fun) {
        this.setModalVisible(false, fun);
    }

    renderActions() {
        return (
            this.props.actions.map((action, key) =>
                <View key={key} style={{flexDirection: 'row-reverse', paddingTop: 24}}>
                    <View style={{paddingLeft: 12}}>{action.icon}</View>
                    <TouchableOpacity hitSlop={{top: 0, bottom: 0, left: 0, right: 50}}
                                      onPress={() => this.reset(action.fn)}>
                        <Button disabled={true}
                                style={styles.actionButton}
                                textStyle={styles.actionButtonText}>{action.label}
                        </Button>
                    </TouchableOpacity>
                </View>
            )
        );
    }

    renderPrimaryAction() {
        return (
            <View style={{flexDirection: 'row-reverse', paddingTop: 24}}>
                <View style={{paddingLeft: 12}}>{this.props.primaryAction.icon}</View>
                <TouchableOpacity hitSlop={{top: 0, bottom: 0, left: 0, right: 50}}
                                  onPress={() => this.reset(this.props.primaryAction.fn)}
                                  style={{paddingTop: 10,}}>
                    <Button disabled={true}
                            style={styles.actionButton}
                            textStyle={styles.actionButtonText}>{this.props.primaryAction.label}
                    </Button>
                </TouchableOpacity>
            </View>
        );
    }

    renderModal() {
        return (
            <Modal
                animationType='fade'
                transparent={true}
                presentationStyle='fullScreen'
                onRequestClose={() => {
                    this.setModalVisible(false)
                }}>
                <TouchableWithoutFeedback onPress={() => {
                    this.setModalVisible(!this.state.modalVisible);
                }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {this.renderPrimaryAction()}
                            {this.renderActions()}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        );
    }

    renderPlusIcon() {
        return <View style={styles.floatingButton}>
            <TouchableOpacity activeOpacity={0.5}
                              onPress={() => this.onPress()}
                              style={{borderRadius: 150, backgroundColor: Colors.AccentColor}}>
                <Icon name="add" style={styles.floatingButtonIcon}/>
            </TouchableOpacity>
        </View>
    }

    render() {
        return (
            <View>
                {!this.state.modalVisible && this.renderPlusIcon()}
                {this.state.modalVisible && this.renderModal()}
            </View>
        );
    }

}

const Action = (char, style = {}) => (
    <TouchableOpacity disabled={true} style={[style, styles.actionIcon]}>
        <Text style={styles.actionIconText}>{char}</Text>
    </TouchableOpacity>
);

const PrimaryAction = (char, style = {}) => (
    <TouchableOpacity disabled={true} style={[style, styles.primaryActionIcon]}>
        <Text style={styles.primaryActionIconText}>{char}</Text>
    </TouchableOpacity>
);

const styles = {
    floatingButton: {
        position: 'absolute',
        width: 54,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        right: 30,
        bottom: 30,
        borderRadius: 30,
        backgroundColor: Colors.AccentColor,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOpacity: 0.8,
        elevation: 10,
        shadowRadius: 15,
        shadowOffset: {width: 1, height: 13},
    },
    floatingButtonIcon: {
        color: Colors.TextOnPrimaryColor,
        fontSize: 36
    },
    modalOverlay: {
        flexDirection: 'column',
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)'
    },
    modalContent: {
        flex: 1,
        flexDirection: 'column-reverse',
        position: 'absolute',
        right: 30,
        bottom: 30,
    },
    actionButton: {
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 20,
        color: Styles.whiteColor,
        padding: 10,
    },
    primaryActionIcon: {
        alignSelf: 'flex-end',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 0,
        height: 54,
        width: 54,
        borderRadius: 30,
    },
    primaryActionIconText: {
        color: Colors.TextOnPrimaryColor,
        // fontFamily: 'Open-Sans',
        fontWeight: 'normal',
        textAlign: 'justify',
        fontSize: 36,
    },
    actionIcon: {
        alignSelf: 'flex-end',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 80,
        elevation: 2,
        marginBottom: 10,
        marginLeft: 4,
        marginRight: 8,
    },
    actionIconText: {
        color: Colors.TextOnPrimaryColor,
        // fontFamily: 'Open-Sans',
        fontWeight: 'normal',
        textAlign: 'justify',
        lineHeight: 30,
        fontSize: 28,
        padding: 6,
    },
};

export default FloatingActionButton;
export {Action, PrimaryAction}
