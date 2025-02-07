use crate::error::Error;
use crate::models::{CommonWords, SockMsg};
use serde_json::json;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::UnixListener;
use tokio::sync::RwLock;
use tokio_postgres::Client;
use crate::commands::speak_by_words::speak_by_words;
use crate::commands::invalid_query::invalid_query;

const SOCKET_PATH: &str = "/tmp/botje_service.sock";

async fn handle_connection(
    socket: tokio::net::UnixStream,
    shared_client: Arc<Client>,
    words_cache: Arc<RwLock<CommonWords>>,
) {
    let (reader, mut writer) = socket.into_split();
    let mut reader = BufReader::new(reader);

    println!("Client connected.");

    loop {
        let mut input = String::new();

        match reader.read_line(&mut input).await {
            Ok(0) => {
                println!("Client disconnected.");
                break;
            }
            Ok(_) => {
                if input.trim().is_empty() {
                    continue;
                }

                let response = match serde_json::from_str::<SockMsg>(input.trim()) {
                    Ok(sock_msg) => {
                        println!("Received: {:?}", sock_msg);

                        match sock_msg.msg_type.as_str() {
                            "speak_by_words" => match speak_by_words(&shared_client, &words_cache, sock_msg.args).await {
                                Ok(data) => json!(data).to_string() + "\n",
                                Err(err) => json!({"error": err.to_string()}).to_string() + "\n",
                            },
                            _ => invalid_query().await.unwrap()
                        }
                    }
                    Err(_) => json!({"error": "Invalid JSON input"}).to_string() + "\n",
                };

                if let Err(err) = writer.write_all(response.as_bytes()).await {
                    eprintln!("Failed to write to socket: {}", err);
                    break;
                }

                println!("Sent: {}", response);
            }
            Err(err) => {
                eprintln!("Error reading from socket: {}", err);
                break;
            }
        }
    }
}

pub async fn run_server(
    shared_client: Arc<Client>,
    words_cache: Arc<RwLock<CommonWords>>,
) -> Result<(), Error> {
    let _ = std::fs::remove_file(SOCKET_PATH);
    let listener = UnixListener::bind(SOCKET_PATH)?;

    println!("Rust service listening on {}", SOCKET_PATH);

    loop {
        let (socket, _) = listener.accept().await?;

        tokio::spawn(handle_connection(
            socket,
            shared_client.clone(),
            words_cache.clone(),
        ));
    }
}
