import moment from "moment";

export function hydrateCalendar(year, month) {
    let baseDate = new Date(2024, month-1, 1);
    let lastDate = new Date(2024, month, 0);
    let prefixes = [...Array(baseDate.getDay()).keys()]
        .map(x=>x+1)
        .map(x=>new Date(year, month-1, 1-x))
        .map(x=>x.getDate())
        .reverse();
    let contents = [...Array(lastDate.getDate()).keys()]
        .map(x=>x+1);
    let suffixes = [];

    // our calendar is 6x7=42
    while (prefixes.length + contents.length + suffixes.length < 42) {
        suffixes.push(suffixes.length+1);
    }

    return [prefixes, contents, suffixes];
}


