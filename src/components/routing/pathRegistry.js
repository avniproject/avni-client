import React from 'react-native';
import Router from './router.js';
import Route from './route.js';

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
        const routes = Array.from(this.views).map(view => <Route path={view.path()}
                                                                 component={view.component()}></Route>);

        return (
            <Router initialRoute={{path: this.defaultView.path()}}>
                {routes}
            </Router>);
    }
}

export default new PathRegistry();