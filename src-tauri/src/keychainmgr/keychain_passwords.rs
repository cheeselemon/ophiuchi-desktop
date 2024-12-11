use security_framework::passwords::{
  delete_generic_password, get_generic_password, set_generic_password,
};
use tauri::ipc::InvokeError;

/**
 * Note:
 * pub fn set_generic_password(
    service: &str,
    account: &str,
    password: &[u8]
) -> Result<()>

  pub fn get_generic_password(service: &str, account: &str) -> Result<Vec<u8>>
  Get the generic password for the given service and account. If no matching keychain entry exists, fails with error code errSecItemNotFound.
 */

const PREFIX: &str = "dev.ophiuchi.app: ";
const SERVICE_NAME_PREFIX: &str = "dev.ophiuchi.app: ";

#[tauri::command(rename_all = "snake_case")]
pub fn save_password(app_name: &str, item_name: &str, password: &str) -> Result<(), InvokeError> {
  let prefixed_service_name = format!("{}{}", SERVICE_NAME_PREFIX, item_name);
  let prefixed_item_name = format!("{}_{}", app_name, item_name);
  set_generic_password(&prefixed_service_name, &prefixed_item_name, password.as_bytes())
    .map_err(|e| InvokeError::from(e.to_string()))?;
  Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_password(app_name: &str, item_name: &str) -> Result<(), InvokeError> {
  let prefixed_service_name = format!("{}{}", SERVICE_NAME_PREFIX, item_name);
  let prefixed_item_name = format!("{}_{}", app_name, item_name);
  delete_generic_password(&prefixed_service_name, &prefixed_item_name)
    .map_err(|e| InvokeError::from(e.to_string()))?;

  Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_password(app_name: &str, item_name: &str) -> Result<String, InvokeError> {
  let prefixed_service_name = format!("{}{}", SERVICE_NAME_PREFIX, item_name);
  let prefixed_item_name = format!("{}_{}", app_name, item_name);
  let password = get_generic_password(&prefixed_service_name, &prefixed_item_name)
    .map_err(|e| InvokeError::from(e.to_string()))?;

  let password = String::from_utf8(password)
    .map_err(|e| InvokeError::from(e.to_string()))?;

  Ok(password)
}
