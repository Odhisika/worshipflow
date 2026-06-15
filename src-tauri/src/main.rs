// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod models;
mod error;
mod repositories;
mod commands;
mod presentation;
mod commands_presentation;
mod timer;
mod commands_timer;
mod commands_bible;
mod bible_importer;
mod commands_auth;
mod commands_members;
mod commands_finance;
mod commands_groups;
mod commands_attendance;
mod commands_events;
mod commands_communications;
mod commands_overview;
mod commands_volunteers;
mod commands_reports;
mod commands_settings;
mod commands_files;
mod commands_checkin;
mod capture;
mod commands_capture;
mod commands_pastoral;
mod commands_visitors;
mod commands_budget;
mod commands_announcements;
mod commands_reminders;
mod commands_receipts;
mod commands_venues;
mod commands_audit;
mod commands_admin_roles;
mod commands_backup;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
}

fn main() {
    env_logger::init();
    println!("DEBUG: Current working directory: {:?}", std::env::current_dir().ok());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Get app data directory
            let app_dir = app.path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_dir)?;

            // Initialize database
            let db_path = app_dir.join("worshipflow.db");
            let conn = database::initialize_database(&db_path)
                .expect("Failed to initialize database");

            // Store connection in app state
            let app_state = AppState {
                db: Mutex::new(conn),
            };
            app.manage(app_state);

            // Auto-initialize Bible versions if not already imported
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<AppState>();

                // Clean up old version names that have been simplified
                {
                    let conn = state.db.lock().unwrap();
                    let _ = crate::repositories::bible::BibleRepository::delete_version(&conn, "Twi Bible 2020 (Akuapem Twi Nkwa Asɛm)");
                    drop(conn);
                }

                let version_files = vec![
                    ("kjv_bible.json", "KJV"),
                    ("web_bible.json", "WEB"),
                    ("asv_bible.json", "ASV"),
                    ("ylt_bible.json", "YLT"),
                    ("TwiAkuapemBible.xml", "Twi (Akuapem)"),
                    ("asv.xml", "ASV"),
                    ("bbe.xml", "BBE"),
                    ("web.xml", "WEB"),
                    ("rsv.xml", "RSV"),
                    ("twi_asante.xml", "Twi (Asante)"),
                ];

                for (file, label) in &version_files {
                    let conn = state.db.lock().unwrap();
                    let already_imported = match crate::repositories::bible::BibleRepository::get_verse_count_for_version(&conn, label) {
                        Ok(c) => c > 0,
                        Err(_) => false,
                    };
                    drop(conn);

                    // Force re-import XML files on every launch to pick up parser changes
                    let should_reimport = already_imported && file.ends_with(".xml");

                    if already_imported && !should_reimport {
                        println!("DEBUG: {} ({}) already imported, skipping.", label, file);
                    } else {
                        if should_reimport {
                            println!("DEBUG: Re-importing {} ({}) (parser might have changed)...", label, file);
                            let conn = state.db.lock().unwrap();
                            let _ = crate::repositories::bible::BibleRepository::delete_version(&conn, label);
                            drop(conn);
                        } else {
                            println!("DEBUG: Importing {} ({})...", label, file);
                        }
                        // Pass label as version_override for XML files (they declare long internal names)
                        let override_name = if file.ends_with(".xml") { Some(*label) } else { None };
                        if let Err(e) = crate::commands_bible::perform_bible_import_from_file(&app_handle, &state, file, override_name) {
                            println!("DEBUG ERROR: Failed to import {}: {:?}", file, e);
                        } else {
                            println!("DEBUG: Successfully imported {} ({})", label, file);
                        }
                    }
                }
            });

            log::info!("WorshipFlow Pro initialized successfully");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(output) = window.get_webview_window("output") {
                    let _ = output.close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Song commands
            commands::create_song,
            commands::get_song,
            commands::get_all_songs,
            commands::search_songs,
            commands::update_song,
            commands::delete_song,
            commands::import_song_from_content,
            // Service commands
            commands::create_service,
            commands::get_service,
            commands::get_all_services,
            commands::update_service,
            commands::delete_service,
            // Activity commands
            commands::create_activity,
            commands::get_activity,
            commands::get_service_activities,
            commands::update_activity,
            commands::reorder_activities,
            commands::delete_activity,
            // Presentation commands
            commands_presentation::load_song_to_presentation,
            commands_presentation::add_slides_to_presentation,
            commands_presentation::add_text_slide,
            commands_presentation::add_bible_slide,
            commands_presentation::next_slide,
            commands_presentation::previous_slide,
            commands_presentation::goto_slide,
            commands_presentation::toggle_blank,
            commands_presentation::start_presentation,
            commands_presentation::stop_presentation,
            commands_presentation::clear_presentation,
            commands_presentation::get_presentation_state,
            commands_presentation::get_presentation_slides,
            commands_presentation::remove_slide_from_presentation,
            commands_presentation::reorder_presentation_slides,
            commands_presentation::open_presentation_window,
            commands_presentation::close_presentation_window,
            commands_presentation::set_presentation_background,
            commands_presentation::open_admin_window,
            // Timer commands
            commands_timer::load_service_to_timer,
            commands_timer::start_next_activity,
            commands_timer::set_timer_activity,
            commands_timer::start_current_timer_activity,
            commands_timer::pause_timer,
            commands_timer::resume_timer,
            commands_timer::add_timer_time,
            commands_timer::stop_timer,
            commands_timer::get_timer_state,
            commands_timer::clear_timer,
            // Bible commands
            commands_bible::get_bible_books,
            commands_bible::get_bible_verses,
            commands_bible::get_chapter_verses,
            commands_bible::search_bible,
            commands_bible::add_bible_verse,
            commands_bible::initialize_bible_books,
            commands_bible::bulk_import_bible_verses,
            commands_bible::import_full_kjv_bible,
            commands_bible::import_bible_version_file,
            commands_bible::get_bible_verse_count,
            commands_bible::get_bible_versions,
            commands_bible::get_active_bible_version,
            commands_bible::set_active_bible_version,
            commands_bible::import_bible_from_user_file,
            commands_bible::delete_bible_version,
            commands_bible::get_bible_version_info,
            commands_bible::open_bible_file_dialog,
            // Auth commands
            commands_auth::login_admin,
            commands_auth::change_admin_password,
            commands_auth::change_admin_email,
            // Member commands
            commands_members::get_members,
            commands_members::get_member_by_id,
            commands_members::create_member,
            commands_members::update_member,
            commands_members::delete_member,
            commands_members::promote_member,
            commands_members::suspend_member,
            commands_members::activate_member,
            // Finance commands
            commands_finance::get_giving_types,
            commands_finance::create_giving_type,
            commands_finance::update_giving_type,
            commands_finance::delete_giving_type,
            commands_finance::get_contributions,
            commands_finance::add_contribution,
            commands_finance::update_contribution,
            commands_finance::delete_contribution,
            commands_finance::get_pledges,
            commands_finance::create_pledge,
            commands_finance::update_pledge,
            commands_finance::add_pledge_payment,
            commands_finance::delete_pledge,
            commands_finance::get_dashboard_stats,
            commands_finance::get_member_tithe_summary,
            commands_finance::get_monthly_giving_trends,
            commands_finance::get_year_comparison,
            commands_finance::get_member_statement,
            // Group commands
            commands_groups::get_groups,
            commands_groups::get_group_by_id,
            commands_groups::create_group,
            commands_groups::update_group,
            commands_groups::delete_group,
            commands_groups::add_member_to_group,
            commands_groups::remove_member_from_group,
            commands_groups::get_group_members,
            // Attendance commands
            commands_attendance::mark_attendance,
            commands_attendance::unmark_attendance,
            commands_attendance::get_service_attendance,
            commands_attendance::get_all_member_attendance_for_service,
            commands_attendance::get_attendance_summary,
            // Event commands
            commands_events::create_event,
            commands_events::get_all_events,
            commands_events::get_event_by_id,
            commands_events::update_event,
            commands_events::delete_event,
            // Communications commands
            commands_communications::create_campaign,
            commands_communications::get_campaigns,
            commands_communications::get_subscriber_stats,
            commands_communications::delete_campaign,
            // Overview commands
            commands_overview::get_system_stats,
            commands_overview::get_recent_activity,
            // Volunteer commands
            commands_volunteers::get_volunteer_roles,
            commands_volunteers::get_volunteer_assignments,
            commands_volunteers::assign_volunteer,
            commands_volunteers::create_volunteer_role,
            // Reports commands
            commands_reports::get_analytics_report,
            // Settings commands
            commands_settings::get_app_config,
            commands_settings::update_setting,
            commands_settings::update_settings_batch,
            // File commands
            commands_files::open_media_file_dialog,
            commands_files::open_folder_dialog,
            commands_files::scan_folder_for_media,
            commands_files::read_image_base64,
            commands_files::prepare_media_for_playback,
            commands_files::read_file_bytes,
            commands_files::save_file,
            // Check-In commands
            commands_checkin::get_active_checkins,
            commands_checkin::check_in_child,
            commands_checkin::check_out_child,
            commands_checkin::create_relationship,
            commands_checkin::get_member_relationships,
            // Terminal logging
            commands::log_to_terminal,
            // Window Capture commands
            commands_capture::list_capturable_windows,
            commands_capture::start_window_capture,
            commands_capture::stop_window_capture,
            commands_capture::get_capture_state,
            commands_capture::present_window_capture_slide,
            // Bible Web Presentation
            commands_capture::present_bible_web,
            // Media Presentation commands
            commands_capture::present_image_slide,
            commands_capture::present_video_slide,
            commands_capture::present_audio_slide,
            // Pastoral Care commands
            commands_pastoral::get_visitations,
            commands_pastoral::create_visitation,
            commands_pastoral::delete_visitation,
            commands_pastoral::get_prayer_requests,
            commands_pastoral::create_prayer_request,
            commands_pastoral::update_prayer_status,
            commands_pastoral::delete_prayer_request,
            commands_pastoral::get_counselling_sessions,
            commands_pastoral::create_counselling_session,
            commands_pastoral::delete_counselling_session,
            // Visitor commands
            commands_visitors::get_visitors,
            commands_visitors::get_visitor_by_id,
            commands_visitors::create_visitor,
            commands_visitors::update_visitor,
            commands_visitors::delete_visitor,
            commands_visitors::get_visitor_followups,
            commands_visitors::create_visitor_followup,
            commands_visitors::update_followup_status,
            commands_visitors::delete_visitor_followup,
            // Budget & Expense commands
            commands_budget::get_budget_categories,
            commands_budget::create_budget_category,
            commands_budget::delete_budget_category,
            commands_budget::get_budgets,
            commands_budget::create_budget,
            commands_budget::update_budget,
            commands_budget::delete_budget,
            commands_budget::get_budget_dashboard,
            commands_budget::get_expense_categories,
            commands_budget::create_expense_category,
            commands_budget::delete_expense_category,
            commands_budget::get_expenses,
            commands_budget::create_expense,
            commands_budget::update_expense,
            commands_budget::delete_expense,
            commands_budget::get_expense_summaries,
            // Announcement commands
            commands_announcements::get_announcements,
            commands_announcements::create_announcement,
            commands_announcements::update_announcement,
            commands_announcements::delete_announcement,
            // Reminder commands
            commands_reminders::get_reminders,
            commands_reminders::create_reminder,
            commands_reminders::delete_reminder,
            commands_reminders::get_upcoming_birthdays,
            commands_reminders::get_upcoming_anniversaries,
            // Receipt commands
            commands_receipts::get_receipts,
            commands_receipts::generate_receipt,
            commands_receipts::delete_receipt,
            // Venue commands
            commands_venues::get_venues,
            commands_venues::create_venue,
            commands_venues::update_venue,
            commands_venues::delete_venue,
            commands_venues::get_venue_bookings,
            commands_venues::create_venue_booking,
            commands_venues::update_booking_status,
            commands_venues::delete_venue_booking,
            commands_venues::get_venues_and_bookings,
            // Audit commands
            commands_audit::get_audit_logs,
            commands_audit::clear_audit_logs,
            // Admin Role commands
            commands_admin_roles::get_admin_roles,
            commands_admin_roles::set_admin_role,
            commands_admin_roles::get_admin_role,
            // Backup commands
            commands_backup::backup_database,
            commands_backup::restore_database,
            commands_backup::list_backups,
            // Member status command
            commands_members::set_member_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
