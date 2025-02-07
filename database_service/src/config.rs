use serde::Deserialize;
use tokio::fs;

use crate::error::Error;

#[derive(Deserialize)]
pub struct Config {
    pub db: DatabaseConfig,
}

#[derive(Deserialize)]
pub struct DatabaseConfig {
    pub user: String,
    pub host: String,
    pub database: String,
    pub password: String,
    pub port: u16,
}

const CONFIG_FILE: &str = "../config.json";

pub async fn load_config() -> Result<Config, Error> {
    let config_data = fs::read_to_string(CONFIG_FILE).await?;
    let config: Config = serde_json::from_str(&config_data)?;
    Ok(config)
}
