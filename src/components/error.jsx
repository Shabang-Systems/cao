import {Component} from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return {
            hasError: true,
            error: error
        };
    }

    componentDidCatch(error, info) {
        // Example "componentStack":
        //   in ComponentThatThrows (created by App)
        //   in ErrorBoundary (created by App)
        //   in div (created by App)
        //   in App
        // TODO you should probably telll someone
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            let fallback = this.props.fallback(this.state.error);
            return fallback;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
