import {Text, View} from "react-native";
import Colors from "../primitives/Colors";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import EntitySyncStatusService from "../../service/EntitySyncStatusService";
import DashboardCacheService from "../../service/DashboardCacheService";
import moment from "moment";
import EntityQueueService from "../../service/EntityQueueService";


class RefreshReminder extends AbstractComponent {

    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    shouldRenderWarning() {
        const entitySyncStatusService = this.getService(EntitySyncStatusService);
        const entityQueueService = this.getService(EntityQueueService);
        const lastSynced = entitySyncStatusService.findAll()
            .filtered("entityName <> 'UserInfo'")
            .sorted("loadedSince", true).slice();
        const allEntityQueueItems = entityQueueService.findAll()
            .filtered("entity <> 'UserInfo'")
            .sorted("savedAt", true).slice();
        const dashboardCacheService = this.getService(DashboardCacheService);
        const lastRefreshTime = dashboardCacheService.cachedData().updatedAt;
        return moment(lastRefreshTime).add(40, 'seconds').isBefore(lastSynced[0].loadedSince) ||
            (allEntityQueueItems.length > 0 && moment(lastRefreshTime).isBefore(allEntityQueueItems[0].savedAt));
    }

    render() {
        return (
            this.shouldRenderWarning() ? <View style={{
                backgroundColor: '#db6565',
                marginTop: 0.5,
                flexWrap: 'wrap',
                minHeight: 20,
                width: '100%',
            }}>
                <Text style={{textAlign: 'center', color: Colors.TextOnPrimaryColor,}}>
                    {this.I18n.t('refreshReminderMessage')}
                </Text>
            </View> : <View/>
        )
    }
}

export default RefreshReminder
