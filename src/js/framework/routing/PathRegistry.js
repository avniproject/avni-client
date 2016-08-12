import React from 'react';
import Router from './Router';
import Route from './Route';

class PathRegistry {

    views = new Set([]);
    defaultView = undefined;

    register(view) {
        this.views.add(view);
    }

    setDefault(view) {
        this.defaultView = view;
    }

    routes() {
        const routes = Array.from(this.views).map((view, index) =>
            <Route key={index} path={view.path()} component={view.component()}/>);

        return (
            <Router initialRoute={{path: this.defaultView.path()}}>
                {routes}
            </Router>
        );
    }
}

export default new PathRegistry();