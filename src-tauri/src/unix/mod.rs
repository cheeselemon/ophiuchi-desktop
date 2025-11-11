//! Unix-only helpers – **no** `#[tauri::command]` here
use std::process::Command;
use regex;

pub fn append_to_hosts(line: &str, password: &str) {
    backup_hosts(password);

    let cmd = format!(
        "echo '{}' | sudo -S -- sh -c 'echo \"{}\" >> /etc/hosts'",
        password, line
    );

    let _ = Command::new("sh").arg("-c").arg(&cmd).status();
}

pub fn delete_line(hostname: &str, password: &str) {
    let esc = regex::escape(hostname);
    let cmd = format!(
        "echo '{}' | sudo -S sed -i '' '/^127\\.0\\.0\\.1[[:space:]]*{}$/d' /etc/hosts",
        password, esc
    );

    let _ = Command::new("sh").arg("-c").arg(&cmd).status();
}

pub fn backup_hosts(password: &str) {
    use chrono::Local;
    let now = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();

    if let Some(home) = std::env::var_os("HOME")
        .and_then(|s| s.into_string().ok())
    {
        let dir = format!("{}/ophiuchi.hosts.bak/", home);
        let _ = Command::new("sh")
            .arg("-c")
            .arg(&format!("mkdir -p {}", dir))
            .status();

        let cp = format!(
            "echo '{}' | sudo -S -- sh -c 'cp /etc/hosts {}/hosts.bak.{}'",
            password, dir, now
        );
        let _ = Command::new("sh").arg("-c").arg(&cp).status();
    }
}

pub fn add_cert(pem: String) -> Result<(), String> {
    let home = std::env::var_os("HOME")
        .ok_or("HOME not set")?
        .to_str()
        .ok_or("HOME not UTF-8")?
        .to_owned();

    let keychain = format!("{}/Library/Keychains/login.keychain-db", home);

    let out = Command::new("security")
        .args(&["add-trusted-cert", "-k", &keychain, &pem])
        .output()
        .map_err(|e| format!("security: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn remove_cert(name: String) -> Result<(), String> {
    let find = format!(
        "security find-certificate -c '{}' -Z | grep SHA-1 | awk '{{print $NF}}'",
        name
    );
    let hash_out = Command::new("sh")
        .arg("-c")
        .arg(&find)
        .output()
        .map_err(|e| format!("find: {}", e))?;

    if !hash_out.status.success() {
        return Err("cert not found".into());
    }
    
    let hash_string = String::from_utf8_lossy(&hash_out.stdout);
    let hash = hash_string.trim();
    if hash.is_empty() {
        return Err("cert not found".into());
    }

    let del = format!("security delete-certificate -Z '{}'", hash);
    let out = Command::new("sh")
        .arg("-c")
        .arg(&del)
        .output()
        .map_err(|e| format!("delete: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn cert_exists(name: String) -> Result<bool, String> {
    let out = Command::new("security")
        .args(&["find-certificate", "-c", &name, "-Z"])
        .output()
        .map_err(|e| format!("security: {}", e))?;

    Ok(out.status.success())
}

pub fn find_certs(name: String) -> Result<String, String> {
    let cmd = format!("security find-certificate -a -c {} -Z", name);
    let out = Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .map_err(|e| format!("find: {}", e))?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).into())
    } else {
        Err("not found".into())
    }
}

pub fn remove_cert_by_sha1(sha1: String) -> Result<(), String> {
    let cmd = format!("security delete-certificate -Z '{}'", sha1);
    let out = Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .output()
        .map_err(|e| format!("delete: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn open_finder(path: String) -> Result<(), String> {
    let out = Command::new("open").arg(path).output()
        .map_err(|e| format!("open: {}", e))?;
    if out.status.success() { Ok(()) } else { Err("open failed".into()) }
}