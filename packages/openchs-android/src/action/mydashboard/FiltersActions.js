class FiltersActions {

    static getInitialState() {
        return {
            filters: []
        };
    }

    static onLoad(state, action, context) {
        return {...state, filters: FiltersActions.cloneFilters(action.filters)}
    }

    static addFilter(state, action, context) {
        const newFilters = FiltersActions.cloneFilters(state.filters.set(action.filter.label, action.filter));
        return {...state, filters: newFilters};
    }

    static cloneFilters(filters) {
        return [...filters.entries()].reduce((acc, [l, f]) => acc.set(l, f.clone()), new Map());
    }
}

const ActionPrefix = 'FilterA';
const FilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ADD_FILTER: `${ActionPrefix}.ADD_FILTER`,
};
const FilterActionMap = new Map([
    [FilterActionNames.ON_LOAD, FiltersActions.onLoad],
    [FilterActionNames.ADD_FILTER, FiltersActions.addFilter]
]);

export {
    FiltersActions, ActionPrefix, FilterActionMap, FilterActionNames
}
