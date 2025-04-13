// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keychainmgr;

use dotenv::dotenv;
// use keychainmgr::keychain_passwords;
use regex;
use std::env;
use std::fs::File;
use std::io::{self, prelude::*};
use std::process::Command;
use tauri_plugin_sentry::{minidump, sentry};

#[tauri::command(rename_all = "snake_case")]
fn add_line_to_hosts(hostname: String, password: String) {
    // Construct the line to add to /etc/hosts
    let line_to_add = format!("127.0.0.1 {}", hostname);
    let _comment = format!("# Added by the Ophiuchi app for {}", hostname);

    // Check if the line already exists in /etc/hosts
    if !host_line_exists(&line_to_add) {
        // Append the new line to /etc/hosts with sudo
        append_to_hosts_with_sudo(&line_to_add, &password);

        // Add the comment above the line
        // add_comment_above_line(&line_to_add, &comment, &password);
    } else {
        println!("Line already exists in /etc/hosts: {}", line_to_add);
    }
}

#[tauri::command(rename_all = "snake_case")]
fn delete_line_from_hosts(hostname: String, password: String) {
    backup_hosts_file(&password);
    find_and_delete_line_hosts_with_sudo(&hostname, &password);
}

fn find_and_delete_line_hosts_with_sudo(hostname: &str, password: &str) {
    let escaped_hostname = regex::escape(hostname);
    let sed_command = format!(
        "echo '{}' | sudo -S sed -i '' '/^127\\.0\\.0\\.1[[:space:]]*{}$/d' /etc/hosts",
        password, escaped_hostname
    );

    let status = Command::new("sh")
        .arg("-c")
        .arg(sed_command)
        .status()
        .expect("Failed to run shell command");

    if status.success() {
        println!("Hostname {} deleted from /etc/hosts", hostname);
    } else {
        eprintln!("Error deleting hostname from /etc/hosts.");
    }
}

// Check if the line already exists in /etc/hosts
fn host_line_exists(line: &str) -> bool {
    if let Ok(hosts) = read_hosts_file() {
        for host in hosts.lines() {
            if host.trim() == line.trim() {
                return true;
            }
        }
    }
    false
}

// Read the contents of /etc/hosts
fn read_hosts_file() -> io::Result<String> {
    let path = "/etc/hosts";
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn backup_hosts_file(password: &str) {
    let cur_day = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();

    if let Some(home_dir) = env::var_os("HOME") {
        if let Some(home_dir_str) = home_dir.to_str() {
            // backup dir is home/hosts.bak/{cur_day}
            let backup_dir = format!("{}/ophiuchi.hosts.bak/", home_dir_str);
            // mkdir if not exists (doesn't require sudo?)
            let mkdir_command = format!("mkdir -p {}", backup_dir);
            let status = Command::new("sh")
                .arg("-c")
                .arg(mkdir_command)
                .status()
                .expect("Failed to run shell command");

            if status.success() {
                println!("Backup directory created: {}", backup_dir);
                // copy /etc/hosts to backup_dir/hosts.bak.{cur_day}
                let backup_command = format!(
                    "echo '{}' | sudo -S -- sh -c 'cp /etc/hosts {}/hosts.bak.{}'",
                    password, backup_dir, cur_day
                );
                let status = Command::new("sh")
                    .arg("-c")
                    .arg(backup_command)
                    .status()
                    .expect("Failed to run shell command");

                if status.success() {
                    println!("Backup of /etc/hosts created.");
                } else {
                    eprintln!("Error creating backup of /etc/hosts.");
                }
            } else {
                eprintln!("Error creating backup directory.");
            }
        }
    }
}

fn append_to_hosts_with_sudo(line: &str, password: &str) {
    backup_hosts_file(password);

    let append_command = format!(
        "echo '{}' | sudo -S -- sh -c 'echo \"{}\" >> /etc/hosts'",
        password, line
    );

    let status = Command::new("sh")
        .arg("-c")
        .arg(append_command)
        .status()
        .expect("Failed to run shell command");

    if status.success() {
        println!("Line added to /etc/hosts: {}", line);
    } else {
        eprintln!("Error appending to /etc/hosts.");
    }
}

#[tauri::command(rename_all = "snake_case")]
fn add_cert_to_keychain(pem_file_path: String) -> Result<(), String> {
    // Get the user's home directory
    if let Some(home_dir) = env::var_os("HOME") {
        if let Some(home_dir_str) = home_dir.to_str() {
            // Create the full path to the keychain file
            let keychain_path = format!("{}/Library/Keychains/login.keychain-db", home_dir_str);

            // Create a command to execute
            let mut command = Command::new("security");

            // Add arguments to the command
            command
                .arg("add-trusted-cert")
                // .arg("-d")
                .arg("-k")
                .arg(&keychain_path) // Use the resolved keychain path
                .arg(&pem_file_path); // Use the provided PEM file path

            // Execute the command
            let output = command.output().expect("Failed to execute command");

            // Check the command's exit status
            if output.status.success() {
                println!("Certificate added successfully.");
                Ok(())
            } else {
                eprintln!("Error: {:?}", output);
                Err("Error adding certificate: reason: ".to_string()
                    + &String::from_utf8_lossy(&output.stderr))
            }
        } else {
            eprintln!("Failed to convert home directory to string.");
            Err("Failed to convert home directory to string".to_string())
        }
    } else {
        eprintln!("Home directory not found.");
        Err("Home directory not found".to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
fn remove_cert_from_keychain(name: String) -> Result<(), String> {
    // Get the user's home directory
    let home_dir = env::var_os("HOME").ok_or_else(|| "Home directory not found.".to_string())?;
    let home_dir_str = home_dir
        .to_str()
        .ok_or_else(|| "Failed to convert home directory to string.".to_string())?;

    // Create the full path to the keychain file
    let keychain_path = format!("{}/Library/Keychains/login.keychain-db", home_dir_str);

    // First find the exact certificate hash
    let find_command = format!(
        "security find-certificate -c '{}' -Z | grep SHA-1 | awk '{{print $NF}}'",
        name
    );

    // Get the hash of the exact certificate
    let hash_output = Command::new("sh")
        .arg("-c")
        .arg(&find_command)
        .output()
        .map_err(|e| format!("Failed to execute find command: {}", e))?;

    if !hash_output.status.success() {
        return Err("Certificate not found".to_string());
    }

    let hash = String::from_utf8_lossy(&hash_output.stdout)
        .trim()
        .to_string();
    if hash.is_empty() {
        return Err("Certificate not found".to_string());
    }

    // Delete the certificate using the exact hash
    let delete_command = format!("security delete-certificate -Z '{}'", hash);

    let output = Command::new("sh")
        .arg("-c")
        .arg(&delete_command)
        .output()
        .map_err(|e| format!("Failed to execute delete command: {}", e))?;

    // Check the command's exit status and provide detailed error message
    if output.status.success() {
        println!("Certificate removed successfully.");
        Ok(())
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to remove certificate: {}", error))
    }
}

#[tauri::command(rename_all = "snake_case")]
fn cert_exist_on_keychain(name: String) -> Result<bool, String> {
    // Create a command to execute
    let mut command = Command::new("security");

    // Add arguments to the command. Find Exact Certificate
    command
        .arg("find-certificate")
        .arg("-c")
        .arg(name)
        .arg("-Z");

    // Execute the command
    let output = command.output().expect("Failed to execute command");

    // Check the command's exit status
    if output.status.success() {
        println!("Certificate found on keychain.");
        Ok(true)
    } else {
        println!("Certificate not found on keychain.");
        Ok(false)
    }
}

#[tauri::command(rename_all = "snake_case")]
fn check_docker_installed() -> Result<bool, String> {
    let output = Command::new("docker").arg("--version").output();

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(err) => Err(format!("Failed to execute command: {}", err)),
    }
}

#[tauri::command[rename_all = "snake_case"]]
fn open_finder_or_explorer(path: String) -> Result<(), String> {
    let output = Command::new("open").arg(path.clone()).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                Err(format!("Failed to open path: {}", path))
            }
        }
        Err(err) => Err(format!("Failed to execute command: {}", err)),
    }
}

#[tauri::command(rename_all = "snake_case")]
fn check_host_exists(hostname: String) -> Result<bool, String> {
    let line_to_check = format!("127.0.0.1 {}", hostname);

    match read_hosts_file() {
        Ok(hosts_content) => {
            let exists = hosts_content
                .lines()
                .filter(|line| !line.trim().starts_with('#'))
                .any(|line| line.trim() == line_to_check.trim());
            Ok(exists)
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
fn get_hosts_file_context() -> Result<String, String> {
    match read_hosts_file() {
        Ok(hosts_content) => Ok(hosts_content),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command(rename_all = "snake_case")]
fn find_certificates(name: String) -> Result<String, String> {
    // Create and execute the command
    let command = format!("security find-certificate -a -c {} -Z", name);

    let output = Command::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| format!("Failed to execute find command: {}", e))?;

    if !output.status.success() {
        return Err("Failed to find certificates".to_string());
    }

    let result = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(result)
}

#[tauri::command(rename_all = "snake_case")]
fn remove_cert_by_sha1(sha1: String) -> Result<(), String> {
    let delete_command = format!("security delete-certificate -Z '{}'", sha1);

    let output = Command::new("sh")
        .arg("-c")
        .arg(&delete_command)
        .output()
        .map_err(|e| format!("Failed to execute delete command: {}", e))?;

    if output.status.success() {
        println!("Certificate removed successfully.");
        Ok(())
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to remove certificate: {}", error))
    }
}

fn main() {
    dotenv().ok();
    let _ = fix_path_env::fix();
    let sentry_dsn = std::env::var("SENTRY_DSN");
    let mut builder =
        tauri::Builder::default().plugin(tauri_plugin_updater::Builder::new().build());

    if sentry_dsn.is_ok() {
        // console output
        println!("Sentry DSN found: {}", sentry_dsn.clone().unwrap());

        let client = sentry::init((
            sentry_dsn.unwrap(),
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        ));

        // Everything before here runs in both app and crash reporter processes
        let _guard = minidump::init(&client);
        // Everything after here runs in only the app process

        builder = builder.plugin(tauri_plugin_sentry::init(&client));
    } else {
        println!("No Sentry DSN found.");
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_docker_installed,
            add_cert_to_keychain,
            remove_cert_from_keychain,
            cert_exist_on_keychain,
            add_line_to_hosts,
            delete_line_from_hosts,
            check_host_exists,
            open_finder_or_explorer,
            // keychain_passwords::save_password,
            // keychain_passwords::get_password,
            // keychain_passwords::delete_password,
            get_hosts_file_context,
            find_certificates,
            remove_cert_by_sha1,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
