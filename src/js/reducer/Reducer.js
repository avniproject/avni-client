const Reducer = {
    factory: (actions, initState, beans) => (state = initState, action) => {
        if (!(actions.has(action.type))) return state;
        return actions.get(action.type)(state, action, beans);
    }
};

export default Reducer;