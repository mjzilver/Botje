use crate::error::Error;

pub async fn invalid_query() -> Result<serde_json::Value, Error> {
    Err(Error::new("Invalid query"))
}
