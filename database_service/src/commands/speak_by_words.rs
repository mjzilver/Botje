use rand::seq::SliceRandom;
use serde_json::json;
use std::sync::Arc;
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
    SELECT message 
    FROM messages
    WHERE message NOT LIKE '%bot%'
        AND message NOT LIKE '%www%'
        AND message NOT LIKE '%http%'
        AND LENGTH(message) BETWEEN 10 AND 150";

    let msg = match msg_args {
        Some(ref args) => args,
        None => return Err(Error::new("Invalid arguments supplied to speak_by_words")),
    };

    let msg_words = process_message(&msg, &words_cache.read().await.words);

    let mut highest_score = 0;
    let mut chosen_message: String = "".to_string();
    let mut rows = client.query(query, &[]).await?;

    let mut rng = rand::rng();
    rows.shuffle(&mut rng);

    let _: Vec<_> = rows
        .iter()
        .map(|row| {
            let mut row_msg: String = row.get("message");
            row_msg = row_msg.to_lowercase();
            let row_words: Vec<&str> = row_msg.split_whitespace().collect();

            let mut score = 0;

            for (j, word) in msg_words.iter().enumerate() {
                if row_words.contains(&word.as_str()) {
                    score += 30 - (j * j);
                }
            }

            if score > highest_score {
                if levenshtein(&row_msg, &msg) > 15 {
                    chosen_message = row_msg;
                    highest_score = score;
                }
            }
        })
        .collect();

    Ok(json!(chosen_message))
}
