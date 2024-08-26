import { useEffect } from "react";

/**
 * Hook that alerts clicks outside of the passed ref
 * https://stackoverflow.com/questions/32553158/detect-click-outside-react-component
 */
export function useOutsideAlerter(ref, outsideCallback) {
    useEffect(() => {
        /**
         * Alert if clicked on outside of element
         */
        function handleClickOutside(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                outsideCallback();
            }
        }
        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);
}
