use super::core::TaskDescription;
use std::cell::RefCell;

/// Given a raw capture buffer, parse the structure and tags of a task.
#[tauri::command]
pub fn parse_tasks(captured: Vec<&str>) -> Vec<TaskDescription> {
    let tag_stack:RefCell<Vec<String>> = RefCell::new(vec![]);
    let mut result:Vec<TaskDescription> = vec![];

    let _ = captured.into_iter().map(|x| {
        let mut res:TaskDescription = TaskDescription::default();
        res.content = x.to_owned();
        res.tags = tag_stack.borrow().clone();
        result.push(res);

        x.split("\n").map(|line| {
            let ts_handle = tag_stack.clone();
            let iter = line.split(" ");
            iter.take(0).next().map(move |elem| {
                if elem.bytes().all(|b| matches!(b, b'#')) {
                    let mut ts = ts_handle.borrow_mut();
                    let level = elem.len();
                    while ts.len() > level {
                        ts.pop();
                    }
                    ts.push(elem.replace("#", "").trim().to_owned());
                }
            })
        })
    });
    result
}


