import {View} from "react-native";
import React, {Component} from "react";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from 'lodash';

class WizardButtons extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        previous: React.PropTypes.object.isRequired,
        next: React.PropTypes.object.isRequired,
        nextDisabled: React.PropTypes.bool.isRequired
    };

    render() {
        const previousButtonLabel = _.isNil(this.props.previous.label) ? this.I18n.t('previous') : this.props.previous.label;
        const nextButtonLabel = _.isNil(this.props.next.label) ? this.I18n.t('next') : this.props.next.label;
        return (
            <View style={{marginTop: 30, marginBottom: 30, justifyContent: 'space-between', flexDirection: 'row'}}>
                {this.props.previous.visible ? <Button primary
                                                       style={{flex: 0.5, backgroundColor: '#e0e0e0'}}
                                                       textStyle={{color: '#212121'}} onPress={() => this.props.previous.func()}>{previousButtonLabel}</Button> :
                    <View style={{flex: 0.5}}/>}
                {this.props.next.visible ? <Button primary
                                                   disabled={this.props.nextDisabled}
                                                   style={{flex: 0.5, marginLeft: 8}} onPress={() => this.props.next.func()}>{nextButtonLabel}</Button> :
                    <View style={{flex: 0.5}}/>}
            </View>
        );
    }
}

export default WizardButtons;