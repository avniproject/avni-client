import {Component} from "react";
import {ToastAndroid} from "react-native";
import PropTypes from "prop-types";

class AvniToast extends Component {
    static propTypes = {
        message: PropTypes.string.isRequired,
        onAutoClose: PropTypes.func.isRequired
    }

    render() {
        const {message, onAutoClose} = this.props;
        setTimeout(() => onAutoClose(), 1000);
        return ToastAndroid.show(message, ToastAndroid.SHORT);
    }
}

export default AvniToast;
