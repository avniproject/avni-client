import React, {Component} from 'react';
import UnhandledErrorView from "./UnhandledErrorView";
import ErrorUtil from "./ErrorUtil";

export default class AvniErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {avniError: null};
    }

    static getDerivedStateFromError(error) {
        const avniError = ErrorUtil.getAvniErrorSync(error);
        return {avniError: avniError};
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.log("AvniErrorBoundary", "componentDidCatch");
    }

    render() {
        console.log("AvniErrorBoundary", "render");
        if (this.state.avniError) {
            return <UnhandledErrorView avniError={this.state.avniError}/>;
        }
        return this.props.children;
    }
}
