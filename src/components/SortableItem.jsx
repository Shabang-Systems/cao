import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableItem({ id, disabled, children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {!disabled && (
                <div
                    ref={setActivatorNodeRef}
                    {...listeners}
                    className="drag-handle"
                >
                    <i className="fa-solid fa-grip-vertical" />
                </div>
            )}
            {children}
        </div>
    );
}
