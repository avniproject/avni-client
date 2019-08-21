/*
*
* All *Actions.js class names should be unique
* When using @Action on a function it adds an Id.
* AbstractComponent.dispatchAction() will make use of this Id.
*
*/

export const Action = (id) => (Class, fnName) => {
    Class[fnName].Id = id || (Class.name + '.' + fnName);
};
