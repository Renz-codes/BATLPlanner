// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use tauri::State;
use serde_json;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
struct CreateTLResponse {
    success: bool,
    path: Option<String>,
    error: Option<String>,
    error_type: Option<String>,
}

// TL名変更用のレスポンス
#[derive(Serialize)]
struct RenameTLResponse {
    success: bool,
    error: Option<String>,
}

// TL削除用のレスポンス
#[derive(Serialize)]
struct DeleteTLResponse {
    success: bool,
    error: Option<String>,
}

// TL名の状態を管理する構造体
struct TLState(Mutex<String>);

// 編成データと設定データを返すための構造体
#[derive(Serialize)]
struct Positions {
    striker_1: String,
    striker_2: String,
    striker_3: String,
    striker_4: String,
    special_1: String,
    special_2: String,
}

#[derive(Serialize)]
struct Settings {
    boss_name: String,
    cost_at_first: f64,
    difficulty: String,
    time_of_another_battle: f64,
}

#[derive(Serialize)]
struct TLData {
    positions: Positions,
    settings: Settings,
}

#[derive(Debug, Serialize, Deserialize)]
struct TodoData {
    tlname: String,
    col: i32,
    event: Option<String>,
    timing: Option<String>,
    late: bool,
    subject: Option<String>,
    memo: Option<String>,
    dropout: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct HenseiData {
    id: String,
    name: String,
}

// データベースパスを定数として定義
const DB_PATH: &str = "./app-data/tlplanner.db";



#[tauri::command]
fn get_tl_names() -> Vec<String> {
    match Connection::open(DB_PATH) {
        Ok(conn) => {
            // テーブルが存在しない場合は作成します
            conn.execute(
                "CREATE TABLE IF NOT EXISTS tlname (
                    name TEXT PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            ).unwrap_or_default();

            // データを取得します
            let mut stmt = conn.prepare("SELECT name FROM tlname ORDER BY created_at DESC").unwrap();
            let tl_names = stmt
                .query_map([], |row| row.get(0))
                .unwrap()
                .filter_map(Result::ok)
                .collect();

            tl_names
        }
        Err(_) => Vec::new() // データベースに接続できない場合は空の配列を返します
    }
}

#[tauri::command]
fn create_new_tl(tlname: &str) -> CreateTLResponse {
    if tlname.is_empty() {
        return CreateTLResponse {
            success: false,
            path: None,
            error: Some("TL名が無効です".to_string()),
            error_type: None,
        };
    }

    match Connection::open(DB_PATH) {
        Ok(mut conn) => {
            // トランザクションを開始
            let tx = conn.transaction().unwrap();

            // 既存のTL名をチェック
            let exists = {
                let mut stmt = tx.prepare("SELECT name FROM tlname WHERE name = ?").unwrap();
                stmt.exists([format!("TL: {}", tlname)]).unwrap()
            };

            if exists {
                return CreateTLResponse {
                    success: false,
                    path: None,
                    error: Some("同じ名前のTLが既に存在します。別の名前を使用してください。".to_string()),
                    error_type: Some("warning".to_string()),
                };
            }

            // 必要なテーブルを作成
            tx.execute(
                "CREATE TABLE IF NOT EXISTS tlname (
                    name TEXT PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            ).unwrap();

            tx.execute(
                "CREATE TABLE IF NOT EXISTS tlsettings (
                    name TEXT PRIMARY KEY,
                    boss_name TEXT DEFAULT 'その他',
                    cost_at_first REAL DEFAULT 0.0,
                    difficulty TEXT DEFAULT 'LUNATIC',
                    time_of_another_battle REAL DEFAULT 0.0
                )",
                [],
            ).unwrap();

            tx.execute(
                "CREATE TABLE IF NOT EXISTS hensei (
                    id TEXT PRIMARY KEY,
                    name TEXT DEFAULT ''
                )",
                [],
            ).unwrap();

            // データを挿入
            tx.execute(
                "INSERT INTO tlname (name) VALUES (?)",
                [format!("TL: {}", tlname)],
            ).unwrap();

            tx.execute(
                "INSERT INTO tlsettings (name, boss_name, cost_at_first, difficulty, time_of_another_battle)
                 VALUES (?, ?, ?, ?, ?)",
                [tlname, "その他", "0.0", "LUNATIC", "0.0"],
            ).unwrap();

            // 編成データを挿入
            let positions = ["STRIKER 1", "STRIKER 2", "STRIKER 3", "STRIKER 4", "SPECIAL 1", "SPECIAL 2"];
            for pos in positions {
                tx.execute(
                    "INSERT INTO hensei (id, name) VALUES (?, ?)",
                    [format!("{} of TL: {}", pos, tlname), String::new()],
                ).unwrap();
            }

            // トランザクションをコミット
            tx.commit().unwrap();

            CreateTLResponse {
                success: true,
                path: Some(format!("/tlplanner/{}", tlname)),
                error: None,
                error_type: None,
            }
        }
        Err(_) => CreateTLResponse {
            success: false,
            path: None,
            error: Some("TLの作成に失敗しました。もう一度お試しください。".to_string()),
            error_type: None,
        }
    }
}

// 現在のTL名を設定するコマンド
#[tauri::command]
fn set_current_tl(state: State<TLState>, tlname: String) {
    *state.0.lock().unwrap() = tlname;
}

// 現在のTL名を取得するコマンド
#[tauri::command]
fn get_current_tl(state: State<TLState>) -> String {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn get_tl_data(tlname: &str) -> TLData {
    // データベースに接続
    match Connection::open(DB_PATH) {
        Ok(conn) => {
            // 編成データ用のマップを初期化
            let mut positions = Positions {
                striker_1: String::new(),
                striker_2: String::new(),
                striker_3: String::new(),
                striker_4: String::new(),
                special_1: String::new(),
                special_2: String::new(),
            };
            
            // 編成データを取得
            let mut stmt = conn.prepare(
                "SELECT id, name FROM hensei WHERE id LIKE ? OR id LIKE ?"
            ).unwrap();
            
            // クエリパラメータを設定
            let striker_pattern = format!("STRIKER % of TL: {}", tlname);
            let special_pattern = format!("SPECIAL % of TL: {}", tlname);
            
            let hensei_rows = stmt.query_map([striker_pattern, special_pattern], |row| {
                let id: String = row.get(0)?;
                let name: String = row.get(1)?;
                Ok((id, name))
            }).unwrap();
            
            // 編成データをマップに配置
            for result in hensei_rows {
                if let Ok((id, name)) = result {
                    if id.starts_with("STRIKER 1") {
                        positions.striker_1 = name;
                    } else if id.starts_with("STRIKER 2") {
                        positions.striker_2 = name;
                    } else if id.starts_with("STRIKER 3") {
                        positions.striker_3 = name;
                    } else if id.starts_with("STRIKER 4") {
                        positions.striker_4 = name;
                    } else if id.starts_with("SPECIAL 1") {
                        positions.special_1 = name;
                    } else if id.starts_with("SPECIAL 2") {
                        positions.special_2 = name;
                    }
                }
            }
            
            // 設定データを取得
            let mut stmt = conn.prepare(
                "SELECT boss_name, cost_at_first, difficulty, time_of_another_battle FROM tlsettings WHERE name = ?"
            ).unwrap();
            
            let settings_result = stmt.query_row([tlname], |row| {
                let boss_name: String = row.get(0)?;
                let cost_at_first: f64 = row.get(1)?;
                let difficulty: String = row.get(2)?;
                let time_of_another_battle: f64 = row.get(3)?;
                
                Ok(Settings {
                    boss_name,
                    cost_at_first,
                    difficulty,
                    time_of_another_battle,
                })
            });
            
            // 設定データをデフォルト値または取得した値に設定
            let settings = settings_result.unwrap_or(Settings {
                boss_name: "その他".to_string(),
                cost_at_first: 0.0,
                difficulty: "LUNATIC".to_string(),
                time_of_another_battle: 0.0,
            });
            
            // データを返す
            TLData {
                positions,
                settings,
            }
        },
        Err(_) => {
            // データベース接続エラー時のデフォルト値
            TLData {
                positions: Positions {
                    striker_1: String::new(),
                    striker_2: String::new(),
                    striker_3: String::new(),
                    striker_4: String::new(),
                    special_1: String::new(),
                    special_2: String::new(),
                },
                settings: Settings {
                    boss_name: "その他".to_string(),
                    cost_at_first: 0.0,
                    difficulty: "LUNATIC".to_string(),
                    time_of_another_battle: 0.0,
                },
            }
        }
    }
}

// 設定を更新するコマンド
#[tauri::command]
fn update_tl_settings(tlname: &str, boss_name: &str, cost_at_first: f64, difficulty: &str, time_of_another_battle: f64) -> bool {
    match Connection::open(DB_PATH) {
        Ok(conn) => {
            let result = conn.execute(
                "UPDATE tlsettings SET boss_name = ?, cost_at_first = ?, difficulty = ?, time_of_another_battle = ? WHERE name = ?",
                [boss_name, &cost_at_first.to_string(), difficulty, &time_of_another_battle.to_string(), tlname]
            );
            
            match result {
                Ok(_) => true,
                Err(e) => {
                    println!("設定更新エラー: {:?}", e);
                    false
                }
            }
        },
        Err(e) => {
            println!("データベース接続エラー: {:?}", e);
            false
        }
    }
}

// 編成データを更新するコマンド
#[tauri::command]
fn update_hensei(formations: Vec<serde_json::Value>) -> bool {
    match Connection::open(DB_PATH) {
        Ok(mut conn) => {
            // トランザクションを開始
            let tx = conn.transaction().unwrap();
            
            // 各編成データを保存
            for formation in formations {
                let id = formation["id"].as_str().unwrap_or("");
                let name = formation["name"].as_str().unwrap_or("");
                
                let result = tx.execute(
                    "UPDATE hensei SET name = ? WHERE id = ?",
                    [name, id]
                );
                
                if let Err(e) = result {
                    println!("編成更新エラー: {:?}", e);
                    return false;
                }
            }
            
            // トランザクションをコミット
            match tx.commit() {
                Ok(_) => true,
                Err(e) => {
                    println!("トランザクションコミットエラー: {:?}", e);
                    false
                }
            }
        },
        Err(e) => {
            println!("データベース接続エラー: {:?}", e);
            false
        }
    }
}

// 設定のみを取得するコマンド
#[tauri::command]
fn get_tl_settings(tlname: &str) -> Settings {
    match Connection::open(DB_PATH) {
        Ok(conn) => {
            // 設定データを取得
            let mut stmt = conn.prepare(
                "SELECT boss_name, cost_at_first, difficulty, time_of_another_battle FROM tlsettings WHERE name = ?"
            ).unwrap();
            
            let settings_result = stmt.query_row([tlname], |row| {
                let boss_name: String = row.get(0)?;
                let cost_at_first: f64 = row.get(1)?;
                let difficulty: String = row.get(2)?;
                let time_of_another_battle: f64 = row.get(3)?;
                
                Ok(Settings {
                    boss_name,
                    cost_at_first,
                    difficulty,
                    time_of_another_battle,
                })
            });
            
            // 設定データをデフォルト値または取得した値に設定
            settings_result.unwrap_or(Settings {
                boss_name: "その他".to_string(),
                cost_at_first: 0.0,
                difficulty: "LUNATIC".to_string(),
                time_of_another_battle: 0.0,
            })
        },
        Err(_) => {
            // データベース接続エラー時のデフォルト値
            Settings {
                boss_name: "その他".to_string(),
                cost_at_first: 0.0,
                difficulty: "LUNATIC".to_string(),
                time_of_another_battle: 0.0,
            }
        }
    }
}

#[tauri::command]
async fn update_todo_data(todo: TodoData) -> Result<(), String> {
    // データベース接続を開く
    let mut conn = Connection::open(DB_PATH).map_err(|e| e.to_string())?;
    
    // トランザクションを開始
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // テーブルが存在しない場合は作成
    tx.execute(
        "CREATE TABLE IF NOT EXISTS todo_data (
            tlname TEXT NOT NULL,
            col INTEGER NOT NULL,
            event TEXT,
            timing TEXT DEFAULT '',
            late BOOLEAN DEFAULT 0,
            subject TEXT,
            memo TEXT,
            dropout TEXT,
            PRIMARY KEY (tlname, col)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // UPSERTパターンを使用
    tx.execute(
        "INSERT INTO todo_data (tlname, col, event, timing, late, subject, memo, dropout) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tlname, col) DO UPDATE SET
         event = excluded.event,
         timing = excluded.timing,
         late = excluded.late,
         subject = excluded.subject,
         memo = excluded.memo,
         dropout = excluded.dropout",
        [
            &todo.tlname,
            &todo.col.to_string(),
            &todo.event.clone().unwrap_or_default(),
            &todo.timing.clone().unwrap_or_default(),
            &todo.late.to_string(),
            &todo.subject.clone().unwrap_or_default(),
            &todo.memo.clone().unwrap_or_default(),
            &todo.dropout.clone().unwrap_or_default(),
        ],
    ).map_err(|e| e.to_string())?;

    // トランザクションをコミット
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_todo_data(tlname: String, col: i32) -> Result<Option<TodoData>, String> {
    let conn = Connection::open(DB_PATH).map_err(|e| e.to_string())?;
    
    // テーブルが存在しない場合は作成
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todo_data (
            tlname TEXT NOT NULL,
            col INTEGER NOT NULL,
            event TEXT,
            timing TEXT DEFAULT '',
            late BOOLEAN DEFAULT 0,
            subject TEXT,
            memo TEXT,
            dropout TEXT,
            PRIMARY KEY (tlname, col)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT event, timing, late, subject, memo, dropout 
         FROM todo_data 
         WHERE tlname = ? AND col = ?"
    ).map_err(|e| e.to_string())?;

    let mut rows = stmt.query([&tlname, &col.to_string()]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(TodoData {
            tlname,
            col,
            event: row.get(0).map_err(|e| e.to_string())?,
            timing: row.get(1).map_err(|e| e.to_string())?,
            late: row.get(2).map_err(|e| e.to_string())?,
            subject: row.get(3).map_err(|e| e.to_string())?,
            memo: row.get(4).map_err(|e| e.to_string())?,
            dropout: row.get(5).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn get_party_data(tlname: String) -> Result<Vec<String>, String> {
    let conn = Connection::open(DB_PATH).map_err(|e| e.to_string())?;
    
    // henseiテーブルが存在しない場合は作成
    conn.execute(
        "CREATE TABLE IF NOT EXISTS hensei (
            id TEXT NOT NULL,
            name TEXT NOT NULL,
            PRIMARY KEY (id)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // todo_dataテーブルが存在しない場合は作成
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todo_data (
            tlname TEXT NOT NULL,
            col INTEGER NOT NULL,
            event TEXT,
            timing TEXT DEFAULT '',
            late BOOLEAN DEFAULT 0,
            subject TEXT,
            memo TEXT,
            dropout TEXT,
            PRIMARY KEY (tlname, col)
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // 検索パターンを作成
    let striker_pattern = format!("STRIKER % of TL: {}", tlname);
    let special_pattern = format!("SPECIAL % of TL: {}", tlname);

    // 指定されたTLに関連する編成データを取得
    let mut stmt = conn.prepare(
        "SELECT DISTINCT name FROM hensei 
         WHERE id LIKE ? 
         OR id LIKE ?"
    ).map_err(|e| e.to_string())?;

    let mut rows = stmt.query([striker_pattern, special_pattern]).map_err(|e| e.to_string())?;
    
    let mut student_names = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let name: String = row.get(0).map_err(|e| e.to_string())?;
        // 空の名前は除外
        if !name.is_empty() {
            student_names.push(name);
        }
    }

    Ok(student_names)
}

#[tauri::command]
async fn get_tl_all_data(tlname: String) -> Result<Vec<TodoData>, String> {
    let conn = Connection::open(DB_PATH).map_err(|e| e.to_string())?;
    
    // テーブルが存在しない場合は作成
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todo_data (
            tlname TEXT NOT NULL,
            col INTEGER NOT NULL,
            event TEXT,
            timing TEXT DEFAULT '',
            late BOOLEAN DEFAULT 0,
            subject TEXT,
            memo TEXT,
            dropout TEXT,
            PRIMARY KEY (tlname, col)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT col, event, timing, late, subject, memo, dropout 
         FROM todo_data 
         WHERE tlname = ?
         ORDER BY col ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([&tlname], |row| {
        // 直接TodoDataを作成して返す
        let col: i32 = row.get(0)?;
        let event: Option<String> = row.get(1)?;
        let timing: Option<String> = row.get(2)?;
        
        // Text型のlateカラムをboolに変換
        let late_text: String = row.get::<_, String>(3).unwrap_or_else(|_| "0".to_string());
        let late = late_text == "1" || late_text.to_lowercase() == "true";
        
        let subject: Option<String> = row.get(4)?;
        let memo: Option<String> = row.get(5)?;
        let dropout: Option<String> = row.get(6)?;
        
        Ok(TodoData {
            tlname: tlname.clone(),
            col,
            event,
            timing,
            late,
            subject,
            memo,
            dropout,
        })
    }).map_err(|e| e.to_string())?;

    let mut todo_data = Vec::new();
    for row_result in rows {
        let row = row_result.map_err(|e| e.to_string())?;
        
        todo_data.push(row);
    }

    Ok(todo_data)
}

#[tauri::command]
async fn delete_todo_row(tlname: String, col: i32) -> Result<(), String> {
    // DBに接続
    let mut conn = Connection::open(DB_PATH).map_err(|e| e.to_string())?;
    
    // テーブルが存在しない場合は作成
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todo_data (
            tlname TEXT NOT NULL,
            col INTEGER NOT NULL,
            event TEXT,
            timing TEXT DEFAULT '',
            late BOOLEAN DEFAULT 0,
            subject TEXT,
            memo TEXT,
            dropout TEXT,
            PRIMARY KEY (tlname, col)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // トランザクションを開始
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 指定された行を削除
    tx.execute(
        "DELETE FROM todo_data WHERE tlname = ? AND col = ?",
        [&tlname, &col.to_string()],
    ).map_err(|e| e.to_string())?;

    // 削除した行より後の行番号を全て1つずつ減らす
    tx.execute(
        "UPDATE todo_data SET col = col - 1 WHERE tlname = ? AND col > ?",
        [&tlname, &col.to_string()],
    ).map_err(|e| e.to_string())?;

    // トランザクションをコミット
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn rename_tl(old_name: String, new_name: String) -> RenameTLResponse {
    // 空の名前やすでに存在する名前はエラー
    if new_name.trim().is_empty() {
        return RenameTLResponse {
            success: false,
            error: Some("新しいTL名が空です".to_string()),
        };
    }

    match Connection::open(DB_PATH) {
        Ok(mut conn) => {
            // トランザクション開始
            match conn.transaction() {
                Ok(tx) => {
                    // 新しい名前が既に存在するか確認
                    let exists = {
                        let mut stmt = match tx.prepare("SELECT name FROM tlname WHERE name = ?") {
                            Ok(stmt) => stmt,
                            Err(e) => return RenameTLResponse {
                                success: false,
                                error: Some(format!("クエリ準備エラー: {}", e)),
                            },
                        };
                        
                        match stmt.exists([format!("TL: {}", new_name)]) {
                            Ok(exists) => exists,
                            Err(e) => return RenameTLResponse {
                                success: false,
                                error: Some(format!("存在確認エラー: {}", e)),
                            },
                        }
                    };

                    if exists {
                        return RenameTLResponse {
                            success: false,
                            error: Some("同じ名前のTLが既に存在します".to_string()),
                        };
                    }

                    // 1. tlname テーブルの更新
                    match tx.execute(
                        "UPDATE tlname SET name = ? WHERE name = ?",
                        [format!("TL: {}", new_name), format!("TL: {}", old_name)]
                    ) {
                        Ok(_) => {},
                        Err(e) => return RenameTLResponse {
                            success: false,
                            error: Some(format!("tlname テーブル更新エラー: {}", e)),
                        },
                    }

                    // 2. tlsettings テーブルの更新
                    match tx.execute(
                        "UPDATE tlsettings SET name = ? WHERE name = ?",
                        [new_name.clone(), old_name.clone()]
                    ) {
                        Ok(_) => {},
                        Err(e) => return RenameTLResponse {
                            success: false,
                            error: Some(format!("tlsettings テーブル更新エラー: {}", e)),
                        },
                    }

                    // 3. hensei テーブルの更新 - STRIKER と SPECIAL の位置情報
                    let positions = [
                        "STRIKER 1", "STRIKER 2", "STRIKER 3", "STRIKER 4", 
                        "SPECIAL 1", "SPECIAL 2"
                    ];
                    
                    for pos in positions {
                        match tx.execute(
                            "UPDATE hensei SET id = ? WHERE id = ?",
                            [
                                format!("{} of TL: {}", pos, new_name),
                                format!("{} of TL: {}", pos, old_name)
                            ]
                        ) {
                            Ok(_) => {},
                            Err(e) => return RenameTLResponse {
                                success: false,
                                error: Some(format!("hensei テーブル更新エラー ({}): {}", pos, e)),
                            },
                        }
                    }

                    // 4. todo_data テーブルの更新
                    match tx.execute(
                        "UPDATE todo_data SET tlname = ? WHERE tlname = ?",
                        [new_name, old_name]
                    ) {
                        Ok(_) => {},
                        Err(e) => return RenameTLResponse {
                            success: false,
                            error: Some(format!("todo_data テーブル更新エラー: {}", e)),
                        },
                    }

                    // トランザクションをコミット
                    match tx.commit() {
                        Ok(_) => RenameTLResponse {
                            success: true,
                            error: None,
                        },
                        Err(e) => RenameTLResponse {
                            success: false,
                            error: Some(format!("トランザクションコミットエラー: {}", e)),
                        },
                    }
                },
                Err(e) => RenameTLResponse {
                    success: false,
                    error: Some(format!("トランザクション開始エラー: {}", e)),
                },
            }
        },
        Err(e) => RenameTLResponse {
            success: false,
            error: Some(format!("データベース接続エラー: {}", e)),
        },
    }
}

#[tauri::command]
fn delete_tl(tlname: String) -> DeleteTLResponse {
    // TL名が空の場合はエラー
    if tlname.trim().is_empty() {
        return DeleteTLResponse {
            success: false,
            error: Some("TL名が無効です".to_string()),
        };
    }

    match Connection::open(DB_PATH) {
        Ok(mut conn) => {
            // トランザクション開始
            match conn.transaction() {
                Ok(tx) => {
                    // 1. tlname テーブルから削除
                    match tx.execute(
                        "DELETE FROM tlname WHERE name = ?",
                        [format!("TL: {}", tlname)]
                    ) {
                        Ok(_) => {},
                        Err(e) => return DeleteTLResponse {
                            success: false,
                            error: Some(format!("tlname テーブル削除エラー: {}", e)),
                        },
                    }

                    // 2. tlsettings テーブルから削除
                    match tx.execute(
                        "DELETE FROM tlsettings WHERE name = ?",
                        [tlname.clone()]
                    ) {
                        Ok(_) => {},
                        Err(e) => return DeleteTLResponse {
                            success: false,
                            error: Some(format!("tlsettings テーブル削除エラー: {}", e)),
                        },
                    }

                    // 3. hensei テーブルから削除 - STRIKER と SPECIAL の位置情報
                    match tx.execute(
                        "DELETE FROM hensei WHERE id LIKE ? OR id LIKE ?",
                        [
                            format!("STRIKER % of TL: {}", tlname),
                            format!("SPECIAL % of TL: {}", tlname)
                        ]
                    ) {
                        Ok(_) => {},
                        Err(e) => return DeleteTLResponse {
                            success: false,
                            error: Some(format!("hensei テーブル削除エラー: {}", e)),
                        },
                    }

                    // 4. todo_data テーブルから削除
                    match tx.execute(
                        "DELETE FROM todo_data WHERE tlname = ?",
                        [tlname]
                    ) {
                        Ok(_) => {},
                        Err(e) => return DeleteTLResponse {
                            success: false,
                            error: Some(format!("todo_data テーブル削除エラー: {}", e)),
                        },
                    }

                    // トランザクションをコミット
                    match tx.commit() {
                        Ok(_) => DeleteTLResponse {
                            success: true,
                            error: None,
                        },
                        Err(e) => DeleteTLResponse {
                            success: false,
                            error: Some(format!("トランザクションコミットエラー: {}", e)),
                        },
                    }
                },
                Err(e) => DeleteTLResponse {
                    success: false,
                    error: Some(format!("トランザクション開始エラー: {}", e)),
                },
            }
        },
        Err(e) => DeleteTLResponse {
            success: false,
            error: Some(format!("データベース接続エラー: {}", e)),
        },
    }
}

fn main() {
    // データベース用ディレクトリを作成（存在しない場合）
    let db_dir = Path::new("./app-data");
    if !db_dir.exists() {
        fs::create_dir_all(db_dir).expect("データベースディレクトリを作成できませんでした");
    }
    
    // データベースに接続して必要なテーブルを作成
    match Connection::open(DB_PATH) {
        Ok(conn) => {
            // 必要なテーブルを作成
            conn.execute(
                "CREATE TABLE IF NOT EXISTS tlname (
                    name TEXT PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            ).expect("tlnameテーブルの作成に失敗しました");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS tlsettings (
                    name TEXT PRIMARY KEY,
                    boss_name TEXT DEFAULT 'その他',
                    cost_at_first REAL DEFAULT 0.0,
                    difficulty TEXT DEFAULT 'LUNATIC',
                    time_of_another_battle REAL DEFAULT 0.0
                )",
                [],
            ).expect("tlsettingsテーブルの作成に失敗しました");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS hensei (
                    id TEXT PRIMARY KEY,
                    name TEXT DEFAULT ''
                )",
                [],
            ).expect("henseiテーブルの作成に失敗しました");

            conn.execute(
                "CREATE TABLE IF NOT EXISTS todo_data (
                    tlname TEXT NOT NULL,
                    col INTEGER NOT NULL,
                    event TEXT,
                    timing TEXT DEFAULT '',
                    late BOOLEAN DEFAULT 0,
                    subject TEXT,
                    memo TEXT,
                    dropout TEXT,
                    PRIMARY KEY (tlname, col)
                )",
                [],
            ).expect("todo_dataテーブルの作成に失敗しました");
        },
        Err(e) => {
            println!("データベース初期化エラー: {:?}", e);
        }
    }
    
    tauri::Builder::default()
        .manage(TLState(Mutex::new(String::new())))
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_tl_names,
            create_new_tl,
            set_current_tl,
            get_current_tl,
            get_tl_data,
            update_tl_settings,
            update_hensei,
            get_tl_settings,
            update_todo_data,
            get_todo_data,
            get_party_data,
            get_tl_all_data,
            delete_todo_row,
            rename_tl,
            delete_tl,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
