export default {
    DATETIME_FORMAT: "MM/DD/YY h:mm a",
    YEARMONTH_FORMAT: "MMMM YYYY",
    TIME_FORMAT: "h:mm a",
    VIEWS__BROWSER: "you can filter by tags @likeso and use .* regex",
    VIEWS__AUTH_WELCOME: ", and welcome to cao!",
    VIEWS__AUTH_HAPPY: "We are happy that you are here;",
    VIEWS__AUTH_PLEASE: "please, ",
    VIEWS__AUTH_DATA: "What you do in cao never leaves your device.",
    VIEWS__AUTH_MALFORM_HEAD: "Malformed Workspace",
    VIEWS__AUTH_MALFORM_SUBHEAD: "Please check that the file exists and is made by cao.",
    // TODO how about end delimiter management
    VIEWS__AUTH_SELECT: "select",
    VIEWS__AUTH_CREATE: "create",
    VIEWS__AUTH_WORKSPACE: " a workspace",
    COMPONENTS__EDITOR__CM_PLACEHOLDER: "Go on, capture something...",
    COMPONENTS__EDITOR__PARAGRAPH_HINT: "Tap between paragraphs to seperate into subtasks.",
    COMPONENTS__TAGBAR_EMPTY: "set some?",
    COMPONENTS__TASK__TAP_TO_SCHEDULE: "unscheduled",
    COMPONENTS__TASK__NO_START_DATE: "no start date",
    COMPONENTS__TASK__NO_DUE_DATE: "no due date",
    COMPONENTS__DATEPICKER__PICK_DT: "Date or time here!",
    COMPONENTS__DATEPICKER__PICK_TIME: "Pick a time here!",
    TOOLTIPS: {
        DONE: "Done",
        RESET: "Reset",
        COMPLETE: "Complete Task",
        DELETE: "Delete Task",
        SCHEDULED: "Set Scheduled Date",
        START: "Set Start Date",
        DUE: "Set Due Date",
        CAPTURE: "Capture",
        BROWSE: "Browse",
        SUBMIT: "Submit",
        CANCEL: "Cancel",
        PREVIOUS_SHEET: "Previous Sheet",
        NEXT_SHEET: "Next Sheet",
    },
    DAYS_OF_WEEK_SHORT: {
        1: "M",
        2: "Tu",
        3: "W",
        4: "Th",
        5: "F",
        6: "Sa",
        // sad, but matches indexing scheme of
        // js. we should probably fix eventually
        0: "Su",
    },
    GREETINGS: [
        "Hello",
        "Howdy",
        "Hi"
    ],
    TEMPORAL_GREETINGS: [
        "Good morning",
        "Good afternoon",
        "Good evening"
    ]
};

