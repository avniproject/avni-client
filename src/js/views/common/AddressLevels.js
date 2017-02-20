import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {CheckBox, Col, Row, Text, Grid, Radio} from "native-base";
import GlobalStyles from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import BaseEntity from "../../models/BaseEntity";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        selectedAddressLevels: React.PropTypes.array.isRequired,
        actionName: React.PropTypes.string.isRequired,
        validationError: React.PropTypes.object
    };

    viewName() {
        return "AddressLevels";
    }

    constructor(props, context) {
        super(props, context, "addressLevels");
        this.inputTextStyle = {fontSize: 16, justifyContent: 'flex-start', marginLeft: 11};
    }

    toggleAddressLevelSelection(addressLevel) {
        return () => {
            this.dispatchAction(this.props.actionName, {value: addressLevel});
        }
    }

    refreshState() {
        this.setState({addressLevels: this.getContextState("addressLevels")});
    }

    renderChoices() {
        this.inputTextStyle.color = _.isNil(this.props.validationError) ? Colors.InputNormal : Colors.ValidationError;

        const props = this.props;
        return _.chunk(this.state.addressLevels, 2).map(([address1, address2], idx) => {
                return (<Row
                    key={idx}
                    style={{
                        padding: DGS.resizeWidth(28),
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderStyle: 'dashed'
                    }}>
                    <Col style={{flex: 1}}>
                        <Row>
                            {this.getSelectComponent(address1)}
                            <Text style={this.inputTextStyle}>{address1.title}</Text>
                        </Row>
                    </Col>
                    <Col style={{flex: 2}}/>
                    <Col style={{flex: 1}}>
                        {_.isNil(address2) ? <Row/> :
                            <Row>
                                {this.getSelectComponent(address2)}
                                <Text style={this.inputTextStyle}>{address2.title}</Text>
                            </Row>}
                    </Col>
                </Row>)
            }
        );
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        return (<Grid>
            <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                <Text style={GlobalStyles.formElementLabel}>{I18n.t("lowestAddressLevel")}</Text>
            </Row>
            {this.renderChoices()}
        </Grid>);
    }

    getSelectComponent(addressLevel) {
        if (this.props.multiSelect)
            return (<CheckBox checked={BaseEntity.collectionHasEntity(this.props.selectedAddressLevels, addressLevel)}
                              onPress={this.toggleAddressLevelSelection(addressLevel)}/>);
        else
            return (<Radio selected={BaseEntity.collectionHasEntity(this.props.selectedAddressLevels, addressLevel)}
                           onPress={this.toggleAddressLevelSelection(addressLevel)}/>);
    }
}

export default AddressLevels;