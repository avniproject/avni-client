/*
*
* Use: @Action(<unique string>)
* AbstractComponent.dispatchAction() will make use of this Id.
*
*/

export const Action = (Id) => (Class, fnName) => { Class[fnName].Id = Id; };
