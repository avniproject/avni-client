# Component Lifecycle Best Practices

## Template Method Pattern

AbstractComponent uses the **Template Method Pattern** for lifecycle management. Subclasses override `onViewDidMount()` instead of `componentDidMount()`.

### ✅ Correct Pattern
```javascript
class MyView extends AbstractComponent {
  onViewDidMount() {
    this.dispatchAction(Actions.ON_LOAD);
  }
}
```

### ❌ Incorrect Pattern
```javascript
class MyView extends AbstractComponent {
  componentDidMount() {
    // Don't override componentDidMount!
    this.dispatchAction(Actions.ON_LOAD);
  }
}
```

## How It Works

AbstractComponent owns `componentDidMount()` and calls `onViewDidMount()` hook:

```javascript
componentDidMount() {
  // Analytics timing (for components with topLevelStateVariable)
  if (!_.isNil(this.topLevelStateVariable) && this.screenRenderStartTime) {
    // ... analytics logging ...
  }
  
  // Call subclass hook (always runs)
  if (this.onViewDidMount) {
    this.onViewDidMount();
  }
}

onViewDidMount() {
  // Subclasses override this
}
```

**Analytics Timing:**
- **UI render time** is logged for debugging (via `requestAnimationFrame`)
- **JS interactions time** is sent to Firebase (via `InteractionManager`) - represents when all processing is complete and screen is fully ready

## Which Components Use This Pattern

### ✅ Use onViewDidMount()
- Screen-level views extending AbstractComponent
- Examples: LoginView, MenuView, SubjectDashboardView, IndividualListView

### ❌ Don't use (not AbstractComponent)
- Form elements: GeolocationFormElement, NumericFormElement, etc.
- Utility components: Pin, ExpandableMedia, NewsCard

## Examples

### Screen View
```javascript
class MyDashboardView extends AbstractComponent {
  onViewDidMount() {
    this.dispatchAction(Actions.ON_LOAD);
  }
}
```

### Form Element
```javascript
class MyFormElement extends AbstractFormElement {
  componentDidMount() {
    // Form elements use componentDidMount normally
    this.setState({value: this.props.value});
  }
}
```
