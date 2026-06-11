use std::sync::Mutex;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;

lazy_static::lazy_static! {
    pub static ref CAPTURE_STATE: Mutex<CaptureState> = Mutex::new(CaptureState::new());
}

pub static CAPTURE_RUNNING: AtomicBool = AtomicBool::new(false);

pub struct CaptureState {
    pub is_capturing: bool,
    pub window_id: String,
    pub window_title: String,
    pub current_frame_path: Option<PathBuf>,
    pub capture_rate_ms: u64,
}

impl CaptureState {
    pub fn new() -> Self {
        Self {
            is_capturing: false,
            window_id: String::new(),
            window_title: String::new(),
            current_frame_path: None,
            capture_rate_ms: 500,
        }
    }
}
