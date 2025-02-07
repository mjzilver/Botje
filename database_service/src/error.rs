use serde::Serialize;
use std::fmt;

use serde_json::Error as SerdeJsonError;
use tokio::io::Error as IoError;
use tokio_postgres::Error as PgError;

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

impl From<PgError> for Error {
    fn from(err: PgError) -> Self {
        Error::new(err.to_string())
    }
}

impl From<IoError> for Error {
    fn from(err: IoError) -> Self {
        Error::new(err.to_string())
    }
}

impl From<SerdeJsonError> for Error {
    fn from(err: SerdeJsonError) -> Self {
        Error::new(err.to_string())
    }
}
