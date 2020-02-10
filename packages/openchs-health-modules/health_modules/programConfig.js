import childProgramConfig from "./child/childProgramConfig";

const programConfigExports = {};
programConfigExports.Child = childProgramConfig;
programConfigExports.Phulwari = childProgramConfig;

const config = function (programName) {
    return !programName ? programConfigExports : programConfigExports[programName];
};

export {
    config
};