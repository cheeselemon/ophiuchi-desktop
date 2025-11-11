//! Windows-only helpers – **no** `#[tauri::command]` here
use std::fs;
use std::process::Command;
use regex;
use std::io::{BufRead, BufReader};
use std::os::windows::process::CommandExt;

pub fn append_to_hosts(line: &str) {
    let hosts_path = r"C:\Windows\System32\drivers\etc\hosts";

    match read_and_prepare_content(hosts_path, line) {
        Ok(new_content) => {
            write_hosts_file_via_temp(hosts_path, &new_content);
        }
        Err(e) => {
            println!("Could not read hosts file: {}", e);
        }
    }
}

fn read_and_prepare_content(path: &str, new_line: &str) -> std::io::Result<String> {
    let file = fs::File::open(path)?;
    let reader = BufReader::new(file);

    let mut lines: Vec<String> = reader.lines()
        .filter_map(|l| l.ok())
        .collect();

    while lines.last().map_or(false, |l| l.trim().is_empty()) {
        lines.pop();
    }

    lines.push(String::new());
    lines.push(new_line.to_string());
    Ok(lines.join("\r\n"))
}

fn write_hosts_file_via_temp(hosts_path: &str, content: &str) {
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("hosts_temp.txt");

    match fs::write(&temp_file, content) {
        Ok(_) => println!("Wrote to temp file: {:?}", temp_file),
        Err(e) => {
            println!("Failed to write temp file: {}", e);
            return;
        }
    }

    let temp_path_str = temp_file.to_str().unwrap();

    let ps = format!(
        "Copy-Item -Path '{}' -Destination '{}' -Force",
        temp_path_str, hosts_path
    );

    let _ = Command::new("powershell")
        .arg("-WindowStyle").arg("Hidden")
        .arg("-Command")
        .arg(&format!(
            "Start-Process powershell -Verb RunAs -WindowStyle Hidden \
             -ArgumentList '-WindowStyle','Hidden','-Command',\"{}\" -Wait",
            ps.replace("\"", "`\"")
        ))
        .status();

    let _ = fs::remove_file(&temp_file);
}

pub fn delete_line(hostname: &str) {
    let hosts_path = r"C:\Windows\System32\drivers\etc\hosts";
    let esc = regex::escape(hostname);

    if let Ok(content) = std::fs::read_to_string(hosts_path) {
        let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        let re = regex::Regex::new(&format!(r"^127\.0\.0\.1\s+{}\s*$", esc)).unwrap();

        let mut new: Vec<String> = Vec::new();
        let mut i = 0;

        while i < lines.len() {
            let current_line = &lines[i];

            if re.is_match(current_line.trim()) {
                if !new.is_empty() && new.last().unwrap().trim().is_empty() {
                    new.pop();
                }
                i += 1;
                continue;
            }

            new.push(current_line.clone());
            i += 1;
        }

        let ps = format!(
            "$c = @'\n{}\n'@; Set-Content -Path '{}' -Value $c -Force",
            new.join("\n"), hosts_path
        );

        let _ = Command::new("powershell")
            .arg("-WindowStyle").arg("Hidden")
            .arg("-Command")
            .arg(&format!(
                "Start-Process powershell -Verb RunAs -WindowStyle Hidden \
                 -ArgumentList '-WindowStyle','Hidden','-Command','{}' -Wait",
                ps.replace("'", "''")
            ))
            .status();
    }
}

pub fn backup_hosts() {
    use chrono::Local;
    let now = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();

    if let Some(profile) = std::env::var_os("USERPROFILE")
        .and_then(|s| s.into_string().ok())
    {
        let dir = format!(r"{}\ophiuchi.hosts.bak\", profile);
        let _ = std::fs::create_dir_all(&dir);
        let dst = format!(r"{}hosts.bak.{}", dir, now);
        let src = r"C:\Windows\System32\drivers\etc\hosts";

        match std::fs::copy(src, &dst) {
            Ok(_) => println!("Backup: {}", dst),
            Err(e) => eprintln!("Backup error: {}", e),
        }
    }
}

pub fn add_cert(pem: String) -> Result<(), String> {
    let ps = format!(
        "Import-Certificate -FilePath '{}' -CertStoreLocation Cert:\\CurrentUser\\Root",
        pem
    );

    let out = Command::new("powershell")
        .creation_flags(0x08000000) // We don't want to show any powershell window to the user
        .arg("-WindowStyle").arg("Hidden")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(&format!(
            "Start-Process powershell -Verb RunAs -WindowStyle Hidden \
             -ArgumentList '-WindowStyle','Hidden','-NoProfile','-Command','{}' -Wait",
            ps.replace("'", "''")
        ))
        .output()
        .map_err(|e| format!("cmd: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn remove_cert(name: String) -> Result<(), String> {
    let ps = format!(
        "$c = Get-ChildItem Cert:\\CurrentUser\\Root | ? {{ $_.Subject -like '*{}*' }} | select -First 1; \
         if ($c) {{ Remove-Item $c.PSPath -Force }}",
        name
    );

    let out = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(&format!(
            "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-Command','{}' -Wait",
            ps.replace("'", "''")
        ))
        .output()
        .map_err(|e| format!("cmd: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn cert_exists(name: String) -> Result<bool, String> {
    let ps = format!(
        "Get-ChildItem Cert:\\CurrentUser\\Root | ? {{ $_.Subject -like '*{}*' }}",
        name
    );

    let out = Command::new("powershell")
        .creation_flags(0x08000000)
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-Command")
        .arg(&ps)
        .output()
        .map_err(|e| format!("cmd: {}", e))?;

    Ok(out.status.success() && !String::from_utf8_lossy(&out.stdout).trim().is_empty())
}

pub fn find_certs(name: String) -> Result<String, String> {
    let ps = format!(
        "Get-ChildItem Cert:\\CurrentUser\\Root | ? {{ $_.Subject -like '*{}*' }} | \
         Format-List Subject,Thumbprint,NotAfter,NotBefore,Issuer",
        name
    );

    let out = Command::new("powershell")
        .creation_flags(0x08000000)
        .arg("-NoProfile")
        .arg("-NonInteractive")
        .arg("-Command")
        .arg(&ps)
        .output()
        .map_err(|e| format!("cmd: {}", e))?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).into())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn remove_cert_by_sha1(sha1: String) -> Result<(), String> {
    let ps = format!(
        "$c = Get-ChildItem Cert:\\CurrentUser\\Root | Where-Object {{ $_.Thumbprint -eq '{}' }}; \
         if ($c) {{ Remove-Item $c.PSPath -Force }}",
        sha1
    );

    let out = Command::new("powershell")
        .arg("-NoProfile")
        .arg("-Command")
        .arg(&ps)
        .output()
        .map_err(|e| format!("cmd: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).into())
    }
}

pub fn open_explorer(path: String) -> Result<(), String> {
    let out = Command::new("explorer").arg(path).output()
        .map_err(|e| format!("cmd: {}", e))?;
    if out.status.success() { Ok(()) } else { Err("explorer failed".into()) }
}