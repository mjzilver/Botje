use crate::error::Error;

pub async fn invalid_query() -> Result<String, Error> {
    Err(Error::new("Invalid query"))
}
