import childProgramConfig from "./child/newChildProgramConfig";

const programConfigExports = {};
programConfigExports.Child = childProgramConfig;

const config = function (programName) {
    return !programName ? programConfigExports : programConfigExports[programName];
};

export {
    config
};