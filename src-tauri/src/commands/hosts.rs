use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{self, BufRead, BufReader};

#[derive(Serialize, Deserialize)]
pub struct HostsFileContext {
    line_number: usize,
    surrounding_lines: Vec<String>,
}

#[tauri::command]
pub async fn get_hosts_file_context(hostname: String) -> Result<HostsFileContext, String> {
    let file = File::open("/etc/hosts").map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let lines: Vec<String> = reader.lines().collect::<io::Result<_>>().map_err(|e| e.to_string())?;
    
    let target_line = lines.iter()
        .enumerate()
        .find(|(_, line)| line.contains(&hostname))
        .ok_or_else(|| "Hostname not found in hosts file".to_string())?;
    
    let start_idx = target_line.0.saturating_sub(2);
    let end_idx = (target_line.0 + 3).min(lines.len());
    
    let context = HostsFileContext {
        line_number: target_line.0 + 1,  // Convert to 1-based line number
        surrounding_lines: lines[start_idx..end_idx].to_vec(),
    };
    
    Ok(context)
} 