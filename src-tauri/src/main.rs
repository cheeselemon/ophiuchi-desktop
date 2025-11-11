// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod keychainmgr;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(target_os = "windows"))]
mod unix;

use dotenv::dotenv;
use std::env;
use std::io::{self, prelude::*};
use std::process::Command;
use tauri_plugin_sentry::{minidump, sentry};

#[tauri::command]
fn get_env(name: &str) -> String {
    env::var(name).unwrap_or_default()
}

/* ------------------------------------------------------------------ */
/*  Helpers that work on both platforms                               */
/* ------------------------------------------------------------------ */

fn host_line_exists(line: &str) -> bool {
    read_hosts_file()
        .map(|c| c.lines().any(|l| l.trim() == line.trim()))
        .unwrap_or(false)
}

fn read_hosts_file() -> io::Result<String> {
    #[cfg(target_os = "windows")]
    let p = r"C:\Windows\System32\drivers\etc\hosts";

    #[cfg(not(target_os = "windows"))]
    let p = "/etc/hosts";

    let mut f = std::fs::File::open(p)?;
    let mut s = String::new();
    f.read_to_string(&mut s)?;
    Ok(s)
}

/* ------------------------------------------------------------------ */
/*  Tauri commands – thin wrappers that delegate to the right module  */
/* ------------------------------------------------------------------ */

#[tauri::command(rename_all = "snake_case")]
fn add_line_to_hosts(hostname: String, _password: String) {
    let line = format!("127.0.0.1 {}", hostname);
    if host_line_exists(&line) {
        return;
    }

    #[cfg(target_os = "windows")]
    windows::append_to_hosts(&line);

    #[cfg(not(target_os = "windows"))]
    unix::append_to_hosts(&line, &_password);
}

#[tauri::command(rename_all = "snake_case")]
fn delete_line_from_hosts(hostname: String, _password: String) {
    #[cfg(target_os = "windows")]
    {
        windows::backup_hosts();
        windows::delete_line(&hostname);
    }

    #[cfg(not(target_os = "windows"))]
    {
        unix::backup_hosts(&_password);
        unix::delete_line(&hostname, &_password);
    }
}

#[tauri::command(rename_all = "snake_case")]
fn add_cert_to_keychain(pem_file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return windows::add_cert(pem_file_path);

    #[cfg(not(target_os = "windows"))]
    return unix::add_cert(pem_file_path);
}

#[tauri::command(rename_all = "snake_case")]
fn remove_cert_from_keychain(name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return windows::remove_cert(name);

    #[cfg(not(target_os = "windows"))]
    return unix::remove_cert(name);
}

#[tauri::command(rename_all = "snake_case")]
fn cert_exist_on_keychain(name: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    return windows::cert_exists(name);

    #[cfg(not(target_os = "windows"))]
    return unix::cert_exists(name);
}

#[tauri::command(rename_all = "snake_case")]
fn check_docker_installed() -> Result<bool, String> {
    Command::new("docker")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
fn open_finder_or_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return windows::open_explorer(path);

    #[cfg(not(target_os = "windows"))]
    return unix::open_finder(path);
}

#[tauri::command(rename_all = "snake_case")]
fn check_host_exists(hostname: String) -> Result<bool, String> {
    let line = format!("127.0.0.1 {}", hostname);
    read_hosts_file()
        .map(|c| c.lines().any(|l| l.trim() == line.trim()))
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
fn get_hosts_file_context() -> Result<String, String> {
    read_hosts_file().map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
fn find_certificates(name: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    return windows::find_certs(name);

    #[cfg(not(target_os = "windows"))]
    return unix::find_certs(name);
}

#[tauri::command(rename_all = "snake_case")]
fn remove_cert_by_sha1(sha1: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return windows::remove_cert_by_sha1(sha1);

    #[cfg(not(target_os = "windows"))]
    return unix::remove_cert_by_sha1(sha1);
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

fn main() {
    dotenv().ok();
    let _ = fix_path_env::fix();

    let mut builder = tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        });

    if let Ok(dsn) = env::var("SENTRY_DSN") {
        let client = sentry::init((
            dsn,
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_env,
            check_docker_installed,
            add_cert_to_keychain,
            remove_cert_from_keychain,
            cert_exist_on_keychain,
            add_line_to_hosts,
            delete_line_from_hosts,
            check_host_exists,
            open_finder_or_explorer,
            get_hosts_file_context,
            find_certificates,
            remove_cert_by_sha1,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
