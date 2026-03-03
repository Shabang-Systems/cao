let _store = null;
let _timer = null;

export function initReindex(store) {
    _store = store;
}

export function debouncedReindex(delay = 150) {
    if (!_store) return;
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(() => {
        _timer = null;
        _store.dispatch({ type: "global/reindex" });
    }, delay);
}
