use crate::error::Error;
use crate::models::CommonWords;
use chrono::Utc;
use std::path::Path;
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tokio_postgres::Client;

const WORDS_FILE: &str = "../json/words.json";

pub async fn load_or_generate_wordlist(client: &Client) -> CommonWords {
    if Path::new(WORDS_FILE).exists() {
        let file_content = fs::read_to_string(WORDS_FILE)
            .await
            .expect(&format!("Unable to read from file {}", WORDS_FILE));

        println!("Loading wordlist from file");

        return serde_json::from_str::<CommonWords>(&file_content)
            .expect(&format!("Unable to parse from file {}", WORDS_FILE));
    }

    println!("Generating fresh word list");

    let word_list = generate_common_words(client)
        .await
        .expect("Could not generate top 100 words");

    let mut word_file = File::create(WORDS_FILE)
        .await
        .expect("Could not write word_file");

    let json_data =
        serde_json::to_string_pretty(&word_list).expect("Could not format word_list to json");
    word_file
        .write_all(json_data.as_bytes())
        .await
        .expect("Could not write JSON to word list file");

    word_list
}

async fn generate_common_words(client: &Client) -> Result<CommonWords, Error> {
    let query = "SELECT message FROM messages";
    let rows = client.query(query, &[]).await?;

    let counts = rows
        .iter()
        .flat_map(|row| {
            let message: String = row.get("message");
            message
                .split_whitespace()
                .map(|w| w.to_lowercase())
                .collect::<Vec<_>>()
        })
        .fold(std::collections::HashMap::new(), |mut acc, word| {
            *acc.entry(word).or_insert(0) += 1;
            acc
        });

    let mut count_vec: Vec<(String, u32)> = counts.into_iter().collect();
    count_vec.sort_by(|a, b| b.1.cmp(&a.1));

    let top_words = count_vec.into_iter().take(100).map(|(w, _)| w).collect();

    Ok(CommonWords {
        timestamp: Utc::now().timestamp_millis(),
        words: top_words,
    })
}
