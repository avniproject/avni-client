import React from 'react';
import {
    TouchableWithoutFeedback,
    StyleSheet,
    Modal,
    View,
} from 'react-native';
import PropTypes from 'prop-types';

class AvniModel extends React.Component {
    static propTypes = {
        children: PropTypes.node.isRequired,
        visible: PropTypes.bool.isRequired,
        dismiss: PropTypes.func.isRequired,
        transparent: PropTypes.bool,
        animationType: PropTypes.string,
    };

    static defaultProps = {
        animationType: 'none',
        transparent: true,
    };

    render() {
        const {props} = this;
        return (
            <View>
                <Modal
                    visible={props.visible}
                    transparent={props.transparent}
                    onRequestClose={props.dismiss}
                    animationType={props.animationType}
                >
                    <TouchableWithoutFeedback onPress={props.dismiss}>
                        <View style={styles.modalOverlay}/>
                    </TouchableWithoutFeedback>

                    <View style={styles.modalContent}>
                        {props.children}
                    </View>
                </Modal>
            </View>
        );
    }
}


const styles = StyleSheet.create({
    modalContent: {
        flex: 1,
        alignItems: 'center',
        marginTop: 100,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
});


export default AvniModel;
