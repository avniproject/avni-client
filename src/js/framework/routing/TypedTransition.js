import invariant from "invariant";
import _ from "lodash";

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

        const route = this.createRoute(viewClass, this.queryParams);

        if (replacePrevious)
            this.navigator.replacePreviousAndPop(route);
        else
            this.navigator.push(route);
        return this;
    }

    createRoute(viewClass, params) {
        const path = viewClass.path();
        return {path, queryParams: params || {}};
    }

    get navigator() {
        return this.view.context.navigator();
    }

    goBack() {
        this.safeDismissKeyboard();
        this.navigator.pop();
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
        this.navigator.popToTop();
        return this;
    }

    resetTo(viewClass) {
        this.safeDismissKeyboard();
        invariant(viewClass.path, `Parameter ${viewClass} should have a function called path`);
        const path = viewClass.path();
        var route = {path, queryParams: this.queryParams || {}};
        this.navigator.resetTo(route);
        return this;
    }

    wizardCompleted(wizardViewClass, newViewClass, params) {
        this.safeDismissKeyboard();
        const currentRoutes = this.navigator.getCurrentRoutes();
        const count = _.sumBy(currentRoutes, (route) => wizardViewClass.path() === route.path ? 1 : 0);
        const newRouteStack = _.dropRight(currentRoutes, count);
        newRouteStack.push(this.createRoute(newViewClass, params));
        this.navigator.immediatelyResetRouteStack(newRouteStack);
    }
}
