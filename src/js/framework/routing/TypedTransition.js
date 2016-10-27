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
        this.safeDismissKeyboard();
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
        this.safeDismissKeyboard();
        this.view.context.navigator().pop();
    }

    safeDismissKeyboard() {
        try {
            require("dismissKeyboard")();
        } catch (e) {
        }
    }

    static from(view) {
        invariant(view, 'Required parameter `{view}`');
        invariant(view.context.navigator, 'Parameter `{view}` should be a React component and have a navigator context');

        return new TypedTransition(view);
    }

    toBeginning() {
        this.safeDismissKeyboard();
        this.view.context.navigator().popToTop();
        return this;
    }

    resetTo(viewClass) {
        this.safeDismissKeyboard();
        invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');
        const path = viewClass.path();
        var route = {path, queryParams: this.queryParams || {}};
        this.view.context.navigator().resetTo(route);
        return this;
    }
}
