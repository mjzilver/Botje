use std::{collections::HashSet, sync::Arc};

use serde_json::json;
use strsim::levenshtein;
use tokio::sync::RwLock;
use tokio_postgres::Client;

use crate::{error::Error, message::process_message, models::CommonWords};

pub async fn speak_by_words(
    client: &Client,
    words_cache: &Arc<RwLock<CommonWords>>,
    msg_args: Option<String>,
) -> Result<serde_json::Value, Error> {
    let query = "
        SELECT message FROM messages
        WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
        AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
        AND LENGTH(message) < 150 AND LENGTH(message) > 10";

    let msg = match msg_args {
        Some(ref args) => args,
        None => return Err(Error::new("Invalid arguments supplied to speak_by_words")),
    };

    let msg_words = process_message(&msg, &words_cache.read().await.words);

    let mut highest_amount = 0;
    let mut chosen_message: String = "".to_string();
    let rows = client.query(query, &[]).await?;

    let _: Vec<_> = rows
        .iter()
        .map(|row| {
            let row_msg: String = row.get("message");
            let row_words: Vec<&str> = row_msg.split_whitespace().collect();

            let set1: HashSet<String> = row_words.iter().map(|s| s.to_lowercase()).collect();
            let set2: HashSet<String> = msg_words.iter().map(|s| s.to_lowercase()).collect();

            let amount = set1.intersection(&set2).count();

            if amount > highest_amount {
                if levenshtein(&row_msg, &msg) > 15 {
                    chosen_message = row_msg;
                    highest_amount = amount;
                }
            }
        })
        .collect();

    Ok(json!(chosen_message))
}
