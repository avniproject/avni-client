import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../framework/view/AbstractComponent';
import _ from "lodash";
import {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from './individual/IndividualSearchView';
import Path from "../framework/routing/Path";
import {Tabs, Container, Title, Button, Icon} from 'native-base';
import theme from './primitives/themes';
import SyncService from "../service/SyncService";
import EntityMetaData from '../models/EntityMetaData';

@Path('/landingView')
@PathRoot
class LandingView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
        this.sync = this.sync.bind(this);
    }

    viewName() {
        return "LandingView";
    }

    sync() {
        var syncService = this.context.getService(SyncService);
        syncService.sync(EntityMetaData.model());
    };

    render() {
        return (
            <Container theme={theme}>
                <View style={{flex: 1, flexDirection: 'row', flexWrap: 'nowrap'}}>
                    <Tabs style={{flex: .9}}>
                        <IndividualSearchView tabLabel='Home'/>
                    </Tabs>
                    <Button style={{flex: .1}} onPress={() => this.sync()}><Icon name="sync"/></Button>
                </View>
            </Container>
        );
    }
}

export default LandingView;