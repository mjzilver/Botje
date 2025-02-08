use crate::commands::invalid_query::invalid_query;
use crate::commands::speak_by_words::speak_by_words;
use crate::error::Error;
use crate::models::{CommonWords, SockMsg};
use serde_json::json;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::unix::OwnedWriteHalf;
use tokio::net::UnixListener;
use tokio::sync::RwLock;
use tokio_postgres::Client;

const SOCKET_PATH: &str = "/tmp/botje_service.sock";

async fn send_response(
    writer: &mut OwnedWriteHalf, 
    id: &str, 
    response: Result<serde_json::Value, Error>
) {
    let full_response = match response {
        Ok(response) => json!({ "id": id, "response": response }).to_string() + "\n",
        Err(err) => json!({ "id": id, "error": err.to_string() }).to_string() + "\n",
    };

    if let Err(err) = writer.write_all(full_response.as_bytes()).await {
        eprintln!("Failed to write to socket: {}", err);
    } else {
        println!("Sent: {}", full_response);
    }
}


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

                let mut id: String = "Invalid ID".to_owned();

                let response = match serde_json::from_str::<SockMsg>(input.trim()) {
                    Ok(sock_msg) => {
                        id = sock_msg.id.clone();

                        println!("Received: {:?}", sock_msg);

                        match sock_msg.msg_type.as_str() {
                            "speak_by_words" => {
                                speak_by_words(&shared_client, &words_cache, sock_msg.args).await
                            }
                            _ => invalid_query().await,
                        }
                    }
                    Err(_) => Err(Error::new("Unable to parse SockMsg")),
                };

                send_response(&mut writer, &id, response).await;
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
