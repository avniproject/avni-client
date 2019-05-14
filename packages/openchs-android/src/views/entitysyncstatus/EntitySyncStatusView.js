import {Alert, Text, TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Actions from "../../action/common/EntitySyncStatusActions";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Styles from "../primitives/Styles";
import EntityQueueService from "../../service/EntityQueueService";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import Distances from "../primitives/Distances";
import EntitySyncStatusSummary from "./EntitySyncStatusSummary";
import EntitySyncStatusTable from "./EntitySyncStatusTable";

@Path('/entitySyncStatusView')
class EntitySyncStatusView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.entitySyncStatusList);
        this.styles = {
            table: {
                backgroundColor: Colors.GreyContentBackground,
            }
        };
    }

    viewName() {
        return 'EntitySyncStatusView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.Names.ON_LOAD);
        super.componentWillMount();
    }

    forceSync() {
        const entityQueueService = this.context.getService(EntityQueueService);
        entityQueueService.requeueAll();
    }

    onForceSync() {
        Alert.alert(
            this.I18n.t('forceSyncWarning'),
            this.I18n.t('forceSyncWarningMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => this.forceSync()
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                },
                    style: 'cancel'
                }
            ]
        )
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('entitySyncStatus')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        <EntitySyncStatusSummary totalQueueCount={this.state.totalQueueCount} lastLoaded={this.state.lastLoaded}/>
                        <EntitySyncStatusTable data={this.state.entitySyncStatusList}/>
                        <TouchableNativeFeedback onPress={() => this.onForceSync()}>
                            <View style={[Styles.basicPrimaryButtonView, {paddingLeft: 8, paddingRight: 8, marginTop: Distances.VerticalSpacingBetweenFormElements}]}>
                                <Text style={{
                                    fontSize: Fonts.Medium,
                                    color: Colors.TextOnPrimaryColor
                                }}>Reset Sync</Text>
                            </View>
                        </TouchableNativeFeedback>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default EntitySyncStatusView;