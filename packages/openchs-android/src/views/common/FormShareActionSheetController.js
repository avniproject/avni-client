import React from "react";
import PropTypes from "prop-types";
import AbstractComponent from "../../framework/view/AbstractComponent";
import FormShareActionSheet from "./FormShareActionSheet";

// Encapsulates share-sheet visibility so reducer-backed parents don't have to
// keep it on this.state — see AbstractComponent.refreshState shallow-equals.
class FormShareActionSheetController extends AbstractComponent {
    static propTypes = {
        onSharePdf: PropTypes.func.isRequired,
        onShareText: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {visible: false, payload: null};
    }

    open(payload) {
        this.setState({visible: true, payload: payload === undefined ? null : payload});
    }

    _close = () => this.setState({visible: false, payload: null});

    render() {
        const {visible, payload} = this.state;
        return (
            <FormShareActionSheet
                visible={visible}
                onClose={this._close}
                onSharePdf={() => this.props.onSharePdf(payload)}
                onShareText={() => this.props.onShareText(payload)}
            />
        );
    }
}

export default FormShareActionSheetController;
