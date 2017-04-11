class EntityTypeChoiceActionNames {
    constructor(prefix) {
        this.prefix = prefix;
        this.LAUNCH_CHOOSE_ENTITY_TYPE = `${prefix}.LAUNCH_CHOOSE_ENTITY_TYPE`;
        this.ENTITY_TYPE_SELECTED = `${prefix}.ENTITY_TYPE_SELECTED`;
        this.CANCELLED_ENTITY_TYPE_SELECTION = `${prefix}.CANCELLED_ENTITY_TYPE_SELECTION`;
        this.ENTITY_TYPE_SELECTION_CONFIRMED = `${prefix}.ENTITY_TYPE_SELECTION_CONFIRMED`;
    }
}

export default EntityTypeChoiceActionNames;