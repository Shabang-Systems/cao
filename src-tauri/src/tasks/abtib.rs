use super::core::TaskDescription;
use std::cell::RefCell;
use std::rc::Rc;

use uuid::Uuid;

/// Given a raw capture buffer, parse the structure and tags of a task.
#[tauri::command]
pub fn parse_tasks(captured: Vec<&str>) -> Vec<TaskDescription> {
    let tag_stack:Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(vec![]));
    let mut result:Vec<TaskDescription> = vec![];
    let capture = Some(Uuid::new_v4().to_string());

    captured.into_iter().for_each(|x| {
        x.split("\n").for_each(|line| {
            let ts_handle = tag_stack.clone();
            let iter = line.split(" ");
            iter.take(1).next().into_iter().for_each(move |elem| {
                if elem.len() > 0 && elem.bytes().all(|b| matches!(b, b'#')) {
                    let level = elem.len();
                    while ts_handle.borrow().len() >= level {
                        ts_handle.borrow_mut().pop();
                    }
                    ts_handle.borrow_mut()
                        .push(line.replace("#", "").trim().to_owned());
                }
            });
        });

        let mut res:TaskDescription = TaskDescription::new(capture.clone());
        res.content = x.to_owned();
        res.tags = tag_stack.borrow().clone();
        result.push(res);
    });
    result
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_tasks() {
        let parsed = parse_tasks(vec![
            "# san jose\n- california",
            "## just south of\n- san francisco\n- the reservation",
            "## they have\n- but not the room\n- this is suscpcious",
            "why?",
        ]);

        dbg!(parsed);
    }
}


