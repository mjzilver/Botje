use crate::error::Error;
use tokio_postgres::{Client, NoTls};

pub async fn create_db_client(db_config: &crate::config::DatabaseConfig) -> Result<Client, Error> {
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
