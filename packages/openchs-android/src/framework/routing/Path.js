import PathRegistry from './PathRegistry';
import _ from 'lodash';

export default function Path(path) {
    return (view) => {
        _.assignIn(view, {component: () => view, path: () => path});
        PathRegistry.register(view);
    };
}

export function PathRoot(view) {
    PathRegistry.setDefault(view);
}
