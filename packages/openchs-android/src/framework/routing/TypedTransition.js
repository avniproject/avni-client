import invariant from "invariant";
import _ from "lodash";
import General from "../../utility/General";

// navigator commands are async in their actual effect of their execution. so if you run more than one navigator action one after other the output is indeterminate
export default class TypedTransition {
    constructor(view) {
        this.view = view;
    }

    with(queryParams) {
        this.queryParams = queryParams;
        return this;
    }

    to(viewClass, isTyped, replace) {
        General.logDebug('TypedTransition', `Route size: ${this.navigator.getCurrentRoutes().length}`);
        this.safeDismissKeyboard();
        invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');
        const route = this.createRoute(viewClass, this.queryParams, isTyped);
        if (replace) {
            this.navigator.replace(route);
        } else {
            this.navigator.push(route);
        }
        return this;
    }

    createRoute(viewClass, params, isTyped) {
        const path = viewClass.path();
        return {path, queryParams: params || {}, isTyped: _.isNil(isTyped) ? false : isTyped};
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

    resetStack(itemsToBeRemoved, newViewClass, params, isTyped) {
        this.safeDismissKeyboard();
        const currentRoutes = this.navigator.getCurrentRoutes();
        const wizardCount = _.sumBy(currentRoutes, (route) => _.some(itemsToBeRemoved, (wizardViewClass) => wizardViewClass.path() === route.path ? 1 : 0));
        var newRouteStack;
        if (_.isNil(newViewClass)) {
            this._popN(wizardCount);
            General.logDebug('TypedTransition', `Initial: ${currentRoutes.length}, Wizard: ${wizardCount}`);
        } else {
            const existingNewViewClassCount = _.sumBy(currentRoutes, (route) => newViewClass.path() === route.path ? 1 : 0);
            newRouteStack = _.dropRight(currentRoutes, wizardCount + existingNewViewClassCount);
            newRouteStack.push(this.createRoute(newViewClass, params, isTyped));
            this.navigator.immediatelyResetRouteStack(newRouteStack);
            General.logDebug('TypedTransition', `Initial: ${currentRoutes.length}, Wizard: ${wizardCount}, Final: ${newRouteStack.length}`);
        }
    }

    _popN(n) {
        this.safeDismissKeyboard();
        this.navigator.popN(n);
        return this;
    }

    popToBookmark() {
        if (!_.isNil(this.navigator.countOfRoutes)) {
            this._popN(this.navigator.getCurrentRoutes().length - this.navigator.countOfRoutes);
            this.navigator.countOfRoutes = null;
        }
    }

    bookmark() {
        this.navigator.countOfRoutes = this.navigator.getCurrentRoutes().length;
        return this;
    }
}
