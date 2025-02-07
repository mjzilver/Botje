use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CommonWords {
    pub timestamp: i64,
    pub words: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct SockMsg {
    pub msg_type: String,
    pub args: Option<String>,
}
