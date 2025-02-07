mod commands;
mod config;
mod database;
mod error;
mod message;
mod models;
mod server;
mod utils;

use crate::database::create_db_client;
use crate::server::run_server;
use crate::utils::load_or_generate_wordlist;
use std::sync::Arc;
use error::Error;
use tokio::sync::RwLock;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let config = config::load_config().await?;
    let db_client = create_db_client(&config.db)
        .await
        .expect("Failed to connect to the database.");
    let shared_client = Arc::new(db_client);

    let words_cache = Arc::new(RwLock::new(load_or_generate_wordlist(&shared_client).await));

    run_server(shared_client, words_cache).await
}
