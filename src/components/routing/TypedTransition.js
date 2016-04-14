import invariant from 'invariant';

export default class TypedTransition {

  constructor(view) {
    this.view = view;
  }

  with(queryParams) {
    this.queryParams = queryParams;
    return this;
  }

  to(viewClass, pathParam) {
    invariant(viewClass.path, 'Parameter `viewClass` should have a function called `path`');

    const path = pathParam ? `${viewClass.path().split(':')[0]}${pathParam}` : viewClass.path();
    this.view.context.navigator().push({ path, queryParams: this.queryParams || {} });
  }

  goBack() {
    this.view.context.navigator().pop();
  }

  toUrl(path) {
    invariant(path, 'Parameter `path` should not be empty');
    this.view.context.navigator().push({ path, queryParams: this.queryParams || {} });
  }

  static from(view) {
    invariant(view, 'Required parameter `{view}`');
    invariant(view.context.navigator, 'Parameter `{view}` should be a React component and have a navigator context');

    return new TypedTransition(view);
  }
}
