import {View} from "react-native";
import React, {Component} from "react";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";

class WizardButtons extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        previous: React.PropTypes.object.isRequired,
        next: React.PropTypes.object.isRequired
    };

    render() {
        return (
            <Row style={{marginTop: 30, marginBottom: 30, justifyContent: 'space-between'}}>
                {this.props.previous.visible ? <Button primary
                         style={{flex: 0.5, backgroundColor: '#e0e0e0'}}
                                                       textStyle={{color: '#212121'}} onPress={() => this.props.previous.func()}>{this.I18n.t('previous')}</Button> : <View style={{flex: 0.5}}/>}
                {this.props.next.visible ? <Button primary
                                                   style={{flex: 0.5, marginLeft: 8}} onPress={() => this.props.next.func()}>{this.I18n.t('next')}</Button> : <View/>}
            </Row>
        );
    }
}

export default WizardButtons;