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

function GlobalErrorModal({error}) {
    return (
        <div
            id="error-modal"
            className="w-full h-full flex items-center justify-center absolute" style={{zIndex: 1000}}>
            <div className="w-8/12 overflow-y-scroll" style={{maxHeight: "89vh"}}>
                <h1 className="block font-bold text-xl">Aw crap!</h1>
                You have broken cao; bad job. :/ <div className="button inline-block" onClick={() => {
                    window.location.href = "/";
                }}>Travel to Safety</div>
                <br />

                <pre style={{whiteSpace: "pre-wrap", wordWrap: "break-word", fontSize: 10, margin: "20px 0"}}>
                    {error}
                </pre>

                Feel free to write to support@shabang.io.
            </div>
        </div>
    );
}

export { GlobalErrorModal, ErrorBoundary };

