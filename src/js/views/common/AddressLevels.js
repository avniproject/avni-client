import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {CheckBox, Col, Row, Text, Grid, Radio} from "native-base";
import {GlobalStyles} from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import BaseEntity from "../../models/BaseEntity";

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        selectedAddressLevels: React.PropTypes.array.isRequired,
        actionName: React.PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.unsubscribe = context.getStore().subscribe(this.refreshState.bind(this));
    }

    toggleAddressLevelSelection(addressLevel) {
        return () => {
            this.dispatchAction(this.props.actionName, {"address_level": addressLevel});
        }
    }

    componentWillMount() {
        this.refreshState();
    }

    refreshState() {
        this.setState({addressLevels: this.getContextState("addressLevels")});
    }

    renderChoices() {
        const props = this.props;
        return _.chunk(this.state.addressLevels, 2).map(([address1, address2]) => {
                return (<Row
                    style={{
                        padding: 28,
                        backgroundColor: '#ffffff',
                        height: 360,
                        borderWidth: 1
                    }}>
                    <Col style={{flexGrow: 1}}>
                        <Row>
                            {this.getSelectComponent(address1)}
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
                            {this.getSelectComponent(address2)}
                            <Text style={{
                                fontSize: 16,
                                justifyContent: 'flex-start',
                                marginLeft: 11
                            }}>{address2.title}</Text>
                        </Row>
                    </Col>
                </Row>)}
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
                          onPress={() => this.toggleAddressLevelSelection(addressLevel)}/>);
        else
            return (<Radio selected={BaseEntity.collectionHasEntity(this.props.selectedAddressLevels, addressLevel)}
                              onPress={() => this.toggleAddressLevelSelection(addressLevel)}/>);
    }
}

export default AddressLevels;