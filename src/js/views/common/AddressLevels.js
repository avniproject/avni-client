import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {CheckBox, Col, Row, Text, Grid} from "native-base";
import Actions from "../../action/index";
import {GlobalStyles} from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        addressLevels: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleVillageSelection(addressLevel) {
        return () => {
            this.dispatchAction(addressLevel.checked ? Actions.REMOVE_ADDRESS_LEVEL_CRITERIA : Actions.ADD_ADDRESS_LEVEL_CRITERIA, {"address_level": addressLevel.title});
        }
    }

    renderChoices() {
        return _.chunk(this.props.addressLevels, 2)
            .map(([address1, address2]) =>
                (<Row
                    style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        height: 360,
                        borderWidth: 1
                    }}>
                    <Col style={{flexGrow: 1}}>
                        <Row>
                            <CheckBox checked={address1.checked}
                                      onPress={this.toggleVillageSelection(address1)}/>
                            <Text style={{
                                fontSize: 16,
                                justifyContent: 'flex-start',
                                marginLeft: 11
                            }}>{address1.title}</Text>
                        </Row>
                    </Col>
                    <Col style={{flexGrow: 2}}/>
                    <Col style={{flexGrow: 1}}>
                        <Row>
                            <CheckBox checked={address2.checked} onPress={this.toggleVillageSelection(address2)}/>
                            <Text style={{
                                fontSize: 16,
                                justifyContent: 'flex-start',
                                marginLeft: 11
                            }}>{address2.title}</Text>
                        </Row>
                    </Col>
                </Row>)
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
}

export default AddressLevels;