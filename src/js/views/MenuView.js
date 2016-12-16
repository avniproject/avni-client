import {View, TouchableHighlight, Text, ProgressBarAndroid, StyleSheet} from 'react-native';
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
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    sync() {
        var syncService = this.context.getService(SyncService);
        syncService.sync(EntityMetaData.model());
    }

    render() {
        return (
            <Content style={SettingsView.styles.mainContent}>

                <Grid>
                    <Row>
                        <Col>
                            <Button transparent large onPress={() => this.sync()}>
                                <Icon name='sync' style={{fontSize: 40}}/>
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
