import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet, Animated, ScrollView, Alert} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from '../framework/routing/Path';
import {Content, Grid, Col, Row, Button, Icon} from "native-base";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import RegistrationView from "./individual/IndividualRegisterView";
import SyncService from "../service/SyncService";
import EntityMetaData from '../models/EntityMetaData';
import EntityService from "../service/EntityService";
import MessageService from "../service/MessageService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from '../views/primitives/DynamicGlobalStyles';

@Path('/menuView')
class MenuView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this.I18n = context.getService(MessageService).getI18n();
        this.createStyles();
    }

    createStyles() {
        this.iconLabelStyle = DynamicGlobalStyles.addFontSize({color: '#fff', justifyContent: 'center'}, 20);
        this.iconStyle = DynamicGlobalStyles.addFontSize({color: '#009688', opacity: 0.8, justifyContent: 'center'}, 48);
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    registrationView() {
        TypedTransition.from(this).to(RegistrationView);
    }

    _preSync() {
        this._animatedValue = new Animated.Value(0);
        Animated.timing(this._animatedValue, {
            toValue: 1000,
            duration: 20000
        }).start();
        this.setState({syncing: true, error: false});
    }

    _postSync() {
        setTimeout(() => this.setState({syncing: false, error: false}), 5000);
    }

    _onError(error) {
        console.log(`Error happened during sync: ${error}`);
        this.setState({syncing: false, error: true});
    }

    sync() {
        try {
            const syncService = this.context.getService(SyncService);
            syncService.sync(EntityMetaData.model(), this._preSync.bind(this), this._postSync.bind(this), this._onError.bind(this));
        } catch (e) {
            this._onError(e);
        }
    }

    renderSyncButton() {
        if (this.state.syncing) {
            const interpolatedRotateAnimation = this._animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['360deg', '0deg']
            });

            return (
                <Animated.View style={{transform: [{rotate: interpolatedRotateAnimation}]}}>
                    <Icon name='sync' style={this.iconStyle}/>
                </Animated.View>);
        } else if (!this.state.syncing && this.state.error) {
            return (<Icon name='sync-problem' style={this.iconStyle}/>);
        } else {
            return (<Icon name='sync' style={this.iconStyle}/>);
        }
    }

    onDeleteSchema = () => {
        const service = this.context.getService(EntityService);
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        Alert.alert(
            this.I18n.t('deleteSchemaConfirmationTitle'),
            this.I18n.t("This will remove the reference, configuration and transaction data"),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                    service.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
                    entitySyncStatusService.setup(EntityMetaData.model());
                }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {},
                    style: 'cancel'
                }
            ]
        )
    };

    render() {
        return (
            <Content style={{backgroundColor: '#212121'}}>
                <Grid style={{marginHorizontal: 29, marginTop: 71}}>
                    <Row>
                        <Col style={{marginHorizontal: 29}}>
                            <Button transparent large onPress={this.sync.bind(this)} style={{justifyContent: 'center'}}>
                                {this.renderSyncButton()}
                            </Button>
                            <Text style={this.iconLabelStyle}>Sync Data</Text>
                        </Col>
                        <Col style={{marginHorizontal: 29}}>
                            <Button onPress={() => this.settingsView()} transparent large>
                                <Icon name='settings' style={this.iconStyle}/>
                            </Button>
                            <Text style={this.iconLabelStyle}>Settings</Text>
                        </Col>
                        <Col style={{marginHorizontal: 29}}>
                            <Button transparent large onPress={this.onDeleteSchema.bind(this)} style={{justifyContent: 'center'}}>
                                <Icon name='delete' style={this.iconStyle}/>
                            </Button>
                            <Text style={this.iconLabelStyle}>Delete Data</Text>
                        </Col>
                    </Row>
                    <Row style={{marginTop: 30}}>
                        <Col style={{marginHorizontal: 29}}>
                            <Button transparent large onPress={()=> this.registrationView()} style={{justifyContent: 'center'}}>
                                <Icon name='person-add' style={this.iconStyle}/>
                            </Button>
                            <Text style={this.iconLabelStyle} onPress={()=> this.registrationView()}>Register</Text>
                        </Col>
                    </Row>
                    {/*{hack for the background color}*/}
                    <Row>
                        <Col><View style={{height: 800}}></View></Col>
                    </Row>
                </Grid>
            </Content>
        );
    }
}

export default MenuView;
