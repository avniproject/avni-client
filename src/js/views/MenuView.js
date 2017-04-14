import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet, Animated, ScrollView, Alert} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import {Content, Grid, Col, Row, Button, Icon} from "native-base";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import EntityMetaData from "../models/EntityMetaData";
import EntityService from "../service/EntityService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import DashboardView from "./program/DashboardView";
import Colors from "./primitives/Colors";
import CHSNavigator from "../utility/CHSNavigator";
import RuleEvaluationService from "../service/RuleEvaluationService";
import Fonts from './primitives/Fonts';

@Path('/menuView')
class MenuView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this.createStyles();
    }

    viewName() {
        return "MenuView";
    }

    static iconLabelStyle = {color: '#fff', justifyContent: 'center', fontSize: Fonts.Large};
    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, justifyContent: 'center', fontSize: 48};

    createStyles() {
        this.mainContainerStyle = {marginHorizontal: DynamicGlobalStyles.resizeWidth(29), marginTop: DynamicGlobalStyles.resizeHeight(71)};
        this.columnStyle = {marginHorizontal: DynamicGlobalStyles.resizeWidth(29)};
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    registrationView() {
        CHSNavigator.navigateToIndividualRegisterView(this);
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
        this.context.getService(RuleEvaluationService).init();
        this.dispatchAction('RESET');
        this.setState({syncing: false, error: false});
        console.log('Sync completed dispatching reset');
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
            return (<Icon name='sync' style={MenuView.iconStyle}/>);
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
                    text: this.I18n.t('no'), onPress: () => {
                },
                    style: 'cancel'
                }
            ]
        )
    };

    renderMenuItem(iconName, menuMessageKey, pressHandler) {
        return (<Col style={this.columnStyle}>
                <Button onPress={pressHandler} transparent large>
                    <Icon name={iconName} style={MenuView.iconStyle}/>
                </Button>
                <Text style={MenuView.iconLabelStyle}>{menuMessageKey}</Text>
            </Col>
        );
    }

    render() {
        return (
            <Content style={{backgroundColor: Colors.BlackBackground}}>
                <Grid style={this.mainContainerStyle}>
                    <Row>
                        <Col style={this.columnStyle}>
                            <Button transparent large onPress={this.sync.bind(this)} style={{justifyContent: 'center'}}>
                                {this.renderSyncButton()}
                            </Button>
                            <Text style={MenuView.iconLabelStyle}>Sync Data</Text>
                        </Col>
                        {this.renderMenuItem('settings', 'Settings', () => this.settingsView())}
                        {this.renderMenuItem('delete', 'Delete Data', () => this.onDeleteSchema())}
                    </Row>
                    <Row style={{marginTop: 30}}>
                        {this.renderMenuItem('person-add', 'Register', () => this.registrationView())}
                        {this.renderMenuItem('view-list', 'Program Summary', () => TypedTransition.from(this).to(DashboardView))}
                        <Col style={this.columnStyle}/>
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
