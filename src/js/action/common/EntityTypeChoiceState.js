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
        this.entity = entity;
        this.entityTypes = entityTypes;
        this.flowState = EntityTypeChoiceState.states.NotStarted;
        return this;
    }

    launchChooseEntityType() {
        this.flowState = EntityTypeChoiceState.states.Launched;
        return this;
    }

    selectedEntityType(entityType) {
        this.flowState = EntityTypeChoiceState.states.EntityTypeSelected;
        this.entityTypeSelectionFn(entityType);
        return this;
    }

    cancelledEntityTypeSelection() {
        this.flowState = EntityTypeChoiceState.states.NotStarted;
        this.entityTypeSelectionFn(null);
        return this;
    }

    entityTypeSelectionConfirmed(action) {
        this.flowState = EntityTypeChoiceState.states.EntityTypeConfirmed;
        action.cb(this);
        return this;
    }
}

export default EntityTypeChoiceState;