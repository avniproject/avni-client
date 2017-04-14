import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {CheckBox, Col, Row, Grid, Radio} from "native-base";
import GlobalStyles from "../primitives/GlobalStyles";
import MessageService from "../../service/MessageService";
import BaseEntity from "../../models/BaseEntity";
import DGS from '../primitives/DynamicGlobalStyles';
import Colors from '../primitives/Colors';
import Reducers from "../../reducer";
import Fonts from '../primitives/Fonts';

class AddressLevels extends AbstractComponent {
    static propTypes = {
        multiSelect: React.PropTypes.bool.isRequired,
        selectedAddressLevels: React.PropTypes.array.isRequired,
        actionName: React.PropTypes.string.isRequired,
        validationError: React.PropTypes.object
    };

    viewName() {
        return AddressLevels.name;
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.addressLevels);
        this.inputTextStyle = {fontSize: Fonts.Large, marginLeft: 11, color: Colors.InputNormal};
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
        const color = _.isNil(this.props.validationError) ? Colors.InputNormal : Colors.ValidationError;
        return _.chunk(this.state.addressLevels, 2).map(([address1, address2], idx) => {
                return (<View
                    key={idx}
                    style={{flexDirection: 'row', marginBottom: DGS.resizeHeight(22)}}>
                    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
                        {this.getSelectComponent(address1)}
                        <Text style={[this.inputTextStyle, {color: color}]}>{this.I18n.t(address1.name)}</Text>
                    </View>
                    <View style={{flex: 1}}>
                        {_.isNil(address2) ? <View/> :
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                {this.getSelectComponent(address2)}
                                <Text style={[this.inputTextStyle, {color: color}]}>{this.I18n.t(address2.name)}</Text>
                            </View>
                        }
                    </View>
                </View>)
            }
        );
    }

    render() {
        const I18n = this.context.getService(MessageService).getI18n();
        return (
            <Grid >
                <Row style={{marginTop: 10, marginBottom: 10}}>
                    <Text style={GlobalStyles.formElementLabel}>{I18n.t("lowestAddressLevel")}</Text>
                </Row>
                <View style={{borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.InputBorderNormal, padding: DGS.resizeWidth(28)}}>
                    {this.renderChoices()}
                </View>
            </Grid>
        );
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