import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet, Animated} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from '../framework/routing/Path';
import {Content, Grid, Col, Row, Button, Icon} from "native-base";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import EntityMetaData from '../models/EntityMetaData';

@Path('/menuView')
class MenuView extends AbstractComponent {
    static styles = StyleSheet.create({
        mainContent: {marginHorizontal: 24},
        main: {
            flexDirection: 'column'
        },
        form: {
            marginTop: 40
        },
        formItem: {
            marginBottom: 10,
            marginHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'flex-end'
        },
        formItemLabel: {
            fontSize: 20,
            color: '#e93a2c',
            flex: 0.18
        },
        formItemInput: {
            height: 40,
            borderColor: '#e93a2c',
            borderWidth: 3,
            flex: 0.7
        }
    });

    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false};
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
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
        this.setState({syncing: false, error: true});
    }

    sync() {
        const syncService = this.context.getService(SyncService);
        syncService.sync(EntityMetaData.model(), this._preSync.bind(this), this._postSync.bind(this), this._onError.bind(this));
    }

    renderSyncButton() {
        console.log(this.state);

        if (this.state.syncing) {
            const interpolatedRotateAnimation = this._animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['360deg', '0deg']
            });

            return (
                <Animated.View style={{transform: [{rotate: interpolatedRotateAnimation}]}}>
                    <Icon name='sync' style={{fontSize: 40}}/>
                </Animated.View>);
        } else if (!this.state.syncing && this.state.error) {
            return (<Icon name='sync-problem' style={{fontSize: 40}}/>);
        } else {
            return (<Icon name='sync' style={{fontSize: 40}}/>);
        }
    }

    render() {
        return (
            <Content style={SettingsView.styles.mainContent}>
                <Grid>
                    <Row>
                        <Col>
                            <Button transparent large onPress={this.sync.bind(this)}>
                                {this.renderSyncButton()}
                            </Button>
                            <Text>Sync Data</Text>
                        </Col>
                        <Col>
                            <Button onPress={() => this.settingsView()} transparent large>
                                <Icon name='settings'/>
                            </Button>
                            <Text>Config settings</Text>
                        </Col>
                    </Row>
                </Grid>
            </Content>
        );
    }
}

export default MenuView;
