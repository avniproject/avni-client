import invariant from 'invariant';

export default class TypedTransition {
    constructor(view) {
        this.view = view;
    }

    with(queryParams) {
        this.queryParams = queryParams;
        return this;
    }

    to(viewClass, sceneConfig) {
        require("dismissKeyboard")();
        invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');

        const path = viewClass.path();
        var route = {path, queryParams: this.queryParams || {}};
        if (sceneConfig !== undefined) {
            route.sceneConfig = sceneConfig;
        }
        this.view.context.navigator().push(route);
        return this;
    }

    goBack() {
        require("dismissKeyboard")();
        this.view.context.navigator().pop();
    }

    static from(view) {
        invariant(view, 'Required parameter `{view}`');
        invariant(view.context.navigator, 'Parameter `{view}` should be a React component and have a navigator context');

        return new TypedTransition(view);
    }

    toBeginning() {
        require("dismissKeyboard")();
        this.view.context.navigator().popToTop();
        return this;
    }

    resetTo(viewClass) {
        require("dismissKeyboard")();
        invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');
        const path = viewClass.path();
        var route = {path, queryParams: this.queryParams || {}};
        this.view.context.navigator().resetTo(route);
        return this;
    }
}
