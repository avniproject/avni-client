import React from 'react-native';
import PathRegistry from "./pathRegistry.js";

const Path = function (path, isDefault) {
    return function (view) {
        view.component = function () {
            return view;
        };
        view.path = function () {
            return path;
        };

        PathRegistry.register(view);

        if (isDefault) {
            PathRegistry.setDefault(view);
        }
    };
};

export default Path;