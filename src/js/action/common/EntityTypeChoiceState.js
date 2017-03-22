class EntityTypeChoiceState {
    static states = {
        NotStarted: 1,
        Launched: 2,
        EntityTypeSelected: 3,
        EntityTypeConfirmed: 4
    };

    constructor(entity, entityTypeSelectionFn, entityCloneFn) {
        this.entityTypes = [];
        this.entity = entity;
        this.flowState = EntityTypeChoiceState.states.NotStarted;
        this.entityTypeSelectionFn = entityTypeSelectionFn;
        this.entityCloneFn = entityCloneFn;
    }

    clone() {
        const entityTypeChoiceState = new EntityTypeChoiceState();
        entityTypeChoiceState.flowState = this.flowState;
        entityTypeChoiceState.entityTypes = this.entityTypes;
        entityTypeChoiceState.entityTypeSelectionFn = this.entityTypeSelectionFn;
        entityTypeChoiceState.entityCloneFn = this.entityCloneFn;
        entityTypeChoiceState.entity = this.entityCloneFn(this.entity);
        return entityTypeChoiceState;
    }

    entityParentSelected(entityTypes, entity) {
        const newState = this.clone();
        newState.entity = entity;
        newState.entityTypes = entityTypes;
        newState.flowState = EntityTypeChoiceState.states.NotStarted;
        return newState;
    }

    launchChooseEntityType(state, action) {
        const newState = this.clone();
        newState.flowState = EntityTypeChoiceState.states.Launched;
        return newState;
    }

    selectedEntityType(entityType) {
        const newState = this.clone();
        newState.flowState = EntityTypeChoiceState.states.EntityTypeSelected;
        newState.entityTypeSelectionFn(entityType);
        return newState;
    }

    cancelledEntityTypeSelection() {
        const newState = this.clone();
        newState.flowState = EntityTypeChoiceState.states.NotStarted;
        newState.entityTypeSelectionFn(null);
        return newState;
    }

    entityTypeSelectionConfirmed(action) {
        const newState = this.clone();
        newState.flowState = EntityTypeChoiceState.states.EntityTypeConfirmed;
        action.cb(newState);
        return newState;
    }
}

export default EntityTypeChoiceState;