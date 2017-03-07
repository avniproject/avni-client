import invariant from 'invariant';
import _ from 'lodash';

export default class TypedTransition {
    constructor(view) {
        this.view = view;
    }

    with(queryParams) {
        this.queryParams = queryParams;
        return this;
    }

    to(viewClass, replacePrevious) {
        this.safeDismissKeyboard();
        invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');

        const path = viewClass.path();
        var route = {path, queryParams: this.queryParams || {}};

        if (replacePrevious)
            this.view.context.navigator().replacePreviousAndPop(route);
        else
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
