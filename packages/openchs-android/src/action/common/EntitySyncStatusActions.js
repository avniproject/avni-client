import EntitySyncStatusService from "../../service/EntitySyncStatusService";
import EntityQueueService from "../../service/EntityQueueService";

export class EntitySyncStatusActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        return {
            entitySyncStatusList: context.get(EntitySyncStatusService).geAllSyncStatus(),
            totalQueueCount: context.get(EntityQueueService).getTotalQueueCount()
        };
    }

    static clone(state) {
        return {
            entitySyncStatusList: state.entitySyncStatusList,
            totalQueueCount: state.totalQueueCount
        };
    }
}

const Prefix = "ESS";

EntitySyncStatusActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
};

EntitySyncStatusActions.Map = new Map([
    [EntitySyncStatusActions.Names.ON_LOAD, EntitySyncStatusActions.onLoad]
]);

export default EntitySyncStatusActions;