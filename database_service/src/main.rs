use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::fmt;
use std::path::Path;
use std::sync::Arc;
use strsim::levenshtein;
use tokio::fs::{self, File};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::UnixListener;
use tokio::sync::RwLock;
use tokio_postgres::{Client, NoTls};

#[derive(Debug, Serialize)]
pub struct Error {
    pub error: String,
}

impl Error {
    pub fn new<S: Into<String>>(msg: S) -> Self {
        Error { error: msg.into() }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.error)
    }
}

impl From<tokio_postgres::Error> for Error {
    fn from(err: tokio_postgres::Error) -> Self {
        Error::new(err.to_string())
    }
}

#[derive(Deserialize)]
struct Config {
    db: DatabaseConfig,
}

#[derive(Deserialize)]
struct DatabaseConfig {
    user: String,
    host: String,
    database: String,
    password: String,
    port: u16,
}

#[derive(Deserialize, Debug)]
struct SockMsg {
    msg_type: String,
    args: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CommonWords {
    timestamp: i64,
    words: Vec<String>,
}

static WORDS_FILE: &str = "../json/words.json";
static CONFIG_FILE: &str = "../config.json";

async fn generate_common_words(client: &Client) -> Result<CommonWords, Error> {
    let query = "SELECT message FROM messages";
    let rows = client.query(query, &[]).await?;

    let counts: HashMap<String, u32> = rows
        .iter()
        .flat_map(|row| {
            let message: String = row.get("message");
            message
                .split_whitespace()
                .map(|word| word.to_lowercase())
                .collect::<Vec<String>>()
        })
        .fold(HashMap::new(), |mut acc, word| {
            *acc.entry(word).or_insert(0) += 1;
            acc
        });

    let mut count_vec: Vec<(String, u32)> = counts.into_iter().collect();
    count_vec.sort_by(|a: &(String, u32), b| b.1.cmp(&a.1));

    let top_words: Vec<String> = count_vec
        .into_iter()
        .take(100)
        .map(|(word, _)| word)
        .collect();

    let word_cache = CommonWords {
        timestamp: Utc::now().timestamp_millis(),
        words: top_words,
    };

    Ok(word_cache)
}

async fn load_or_generate_wordlist(client: &Client) -> CommonWords {
    if Path::new(WORDS_FILE).exists() {
        let file_content = fs::read_to_string(WORDS_FILE)
            .await
            .expect(&format!("Unable to read from file {}", WORDS_FILE));

        println!("Loading wordlist from file");

        return serde_json::from_str::<CommonWords>(&file_content)
            .expect(&format!("Unable to parse from file {}", WORDS_FILE))
    }

    println!("Generating fresh word list");

    let word_list = generate_common_words(&client)
        .await
        .expect("Could not generate top 100 words");

    let mut word_file = File::create(WORDS_FILE)
        .await
        .expect("Cloud not write word_file");

    let json_data = serde_json::to_string_pretty(&word_list)
        .expect("Could not format word_list to json");
    word_file.write_all(json_data.as_bytes()).await
    .expect("Could not write JSON to word list file");

    word_list
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config_data = fs::read_to_string(CONFIG_FILE)
        .await
        .expect("Failed to read config.json.");
    let config: Config = serde_json::from_str(&config_data).expect("Failed the parse config.json.");

    let db_client = create_db_client(&config.db)
        .await
        .expect("Failed to connect to the database.");
    let shared_client = Arc::new(db_client);

    let socket_path = "/tmp/botje_service.sock";
    let _ = std::fs::remove_file(socket_path);
    let listener = UnixListener::bind(socket_path)
        .expect("Failed to bind to Unix socket at /tmp/botje_service.sock.");

    println!("Rust service listening on {}", socket_path);

    let words_cache = 
        Arc::new(RwLock::new(load_or_generate_wordlist(&shared_client).await));

    loop {
        let (mut socket, _) = listener.accept().await?;
        let mut reader = BufReader::new(&mut socket);
        let client = Arc::clone(&shared_client);

        let mut input = String::new();
        if let Err(err) = reader.read_line(&mut input).await {
            eprintln!("Failed to read from socket: {}", err);
            continue;
        }

        let sock_msg: SockMsg = match serde_json::from_str(input.trim()) {
            Ok(msg) => msg,
            Err(err) => {
                eprintln!("Failed to parse JSON message: {}", err);
                let response = json!({"error": "Invalid JSON input"}).to_string() + "\n";
                socket
                    .write_all(response.as_bytes())
                    .await
                    .unwrap_or_default();
                continue;
            }
        };

        println!("Received: {:?}", sock_msg);

        let result = match sock_msg.msg_type.as_str() {
            "speak_by_words" => get_speak_by_words(&client, &words_cache, sock_msg.args).await,
            _ => get_invalid_query().await,
        };

        let response = match result {
            Ok(data) => json!(data).to_string() + "\n",
            Err(err) => {
                eprintln!("Handler error: {}", err);
                json!({"error": "Processing failed"}).to_string() + "\n"
            }
        };

        if let Err(err) = socket.write_all(response.as_bytes()).await {
            eprintln!("Failed to write to socket: {}", err);
        }
    }
}

async fn create_db_client(db_config: &DatabaseConfig) -> Result<Client, Error> {
    let connection_string = format!(
        "host={} user={} dbname={} password={} port={}",
        db_config.host, db_config.user, db_config.database, db_config.password, db_config.port
    );

    let (client, connection) = tokio_postgres::connect(&connection_string, NoTls).await?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    Ok(client)
}

async fn get_invalid_query() -> Result<serde_json::Value, Error> {
    Err(Error::new("Invalid query"))
}

fn process_message(message: &str, words_cache: &Vec<String>) -> Vec<String> {
    let re = Regex::new(r"(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http(.*)|speak)\b").unwrap();
    let filtered = re.replace_all(message, "").to_string();

    let text_only = filtered.trim();
    let mut words: Vec<String> = text_only
        .split_whitespace()
        .map(String::from)
        .filter(|w| !w.is_empty())
        .collect();

    words.retain(|word| !words_cache.contains(word));

    if words.len() > 1 {
        let vowel_re = Regex::new(r"[aeiouy]{1,2}").unwrap();
        words.sort_by(|a, b| {
            let a_vowel_count = vowel_re.find_iter(a).count();
            let b_vowel_count = vowel_re.find_iter(b).count();
            b_vowel_count.cmp(&a_vowel_count)
        });
    }

    words
}

async fn get_speak_by_words(
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
