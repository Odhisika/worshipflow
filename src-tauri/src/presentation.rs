use crate::error::{AppError, AppResult};
use crate::models::{Slide, SlideType};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresentationState {
    pub slides: Vec<Slide>,
    pub current_index: usize,
    pub is_live: bool,
    pub is_blank: bool,
}

impl Default for PresentationState {
    fn default() -> Self {
        Self {
            slides: Vec::new(),
            current_index: 0,
            is_live: false,
            is_blank: false,
        }
    }
}

impl PresentationState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn load_slides(&mut self, mut slides: Vec<Slide>) {
        // Inherit the background from the current slides if there is one
        let current_bg = self.slides.iter().find_map(|s| s.background_path.clone());
        if let Some(bg) = current_bg {
            for slide in &mut slides {
                slide.background_path = Some(bg.clone());
            }
        }
        
        self.slides = slides;
        self.current_index = 0;
    }

    pub fn next_slide(&mut self) -> AppResult<()> {
        if self.current_index < self.slides.len().saturating_sub(1) {
            self.current_index += 1;
            Ok(())
        } else {
            Err(AppError::InvalidInput("Already at last slide".to_string()))
        }
    }

    pub fn previous_slide(&mut self) -> AppResult<()> {
        if self.current_index > 0 {
            self.current_index -= 1;
            Ok(())
        } else {
            Err(AppError::InvalidInput("Already at first slide".to_string()))
        }
    }

    pub fn goto_slide(&mut self, index: usize) -> AppResult<()> {
        if index < self.slides.len() {
            self.current_index = index;
            Ok(())
        } else {
            Err(AppError::InvalidInput(format!("Invalid slide index: {}", index)))
        }
    }

    pub fn get_current_slide(&self) -> Option<&Slide> {
        self.slides.get(self.current_index)
    }

    pub fn get_next_slide(&self) -> Option<&Slide> {
        self.slides.get(self.current_index + 1)
    }

    pub fn toggle_blank(&mut self) {
        self.is_blank = !self.is_blank;
    }

    pub fn start_presentation(&mut self) {
        self.is_live = true;
        self.current_index = 0;
        self.is_blank = false;
    }

    pub fn stop_presentation(&mut self) {
        self.is_live = false;
        self.is_blank = false;
    }

    pub fn clear_slides(&mut self) {
        self.slides.clear();
        self.current_index = 0;
        self.is_live = false;
        self.is_blank = false;
    }

    pub fn add_slide(&mut self, mut slide: Slide) {
        // Inherit background
        if slide.background_path.is_none() {
            slide.background_path = self.slides.iter().find_map(|s| s.background_path.clone());
        }
        self.slides.push(slide);
    }

    /// Add a slide and immediately navigate to it (for live bible/text inserts).
    pub fn add_slide_and_goto(&mut self, mut slide: Slide) {
        if slide.background_path.is_none() {
            slide.background_path = self.slides.iter().find_map(|s| s.background_path.clone());
        }
        self.slides.push(slide);
        self.current_index = self.slides.len() - 1;
    }

    pub fn remove_slide(&mut self, index: usize) -> AppResult<()> {
        if index < self.slides.len() {
            self.slides.remove(index);
            if self.current_index >= self.slides.len() && self.current_index > 0 {
                self.current_index = self.slides.len() - 1;
            }
            Ok(())
        } else {
            Err(AppError::InvalidInput(format!("Invalid slide index: {}", index)))
        }
    }

    pub fn reorder_slides(&mut self, from: usize, to: usize) -> AppResult<()> {
        if from >= self.slides.len() || to >= self.slides.len() {
            return Err(AppError::InvalidInput("Invalid slide indices".to_string()));
        }
        
        let slide = self.slides.remove(from);
        self.slides.insert(to, slide);
        
        Ok(())
    }
}

// Global presentation state
lazy_static::lazy_static! {
    pub static ref PRESENTATION: Mutex<PresentationState> = Mutex::new(PresentationState::new());
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresentationInfo {
    pub current_index: usize,
    pub total_slides: usize,
    pub is_live: bool,
    pub is_blank: bool,
    pub current_slide: Option<Slide>,
    pub next_slide: Option<Slide>,
}

pub fn generate_presentation_info(presentation: &PresentationState) -> PresentationInfo {
    PresentationInfo {
        current_index: presentation.current_index,
        total_slides: presentation.slides.len(),
        is_live: presentation.is_live,
        is_blank: presentation.is_blank,
        current_slide: presentation.get_current_slide().cloned(),
        next_slide: presentation.get_next_slide().cloned(),
    }
}

// Helper functions for slide generation
pub fn generate_song_slides(lyrics: &str, title: &str) -> Vec<Slide> {
    let mut slides = Vec::new();
    let mut slide_count = 0;

    // Split lyrics by double line breaks (stanzas)
    let sections: Vec<&str> = lyrics.split("\n\n").collect();

    for section in sections {
        let section = section.trim();
        if section.is_empty() {
            continue;
        }

        slide_count += 1;

        // Check if the first line is a stanza label
        let (label_display, body_lines): (Option<String>, Vec<&str>) =
            if let Some((_, display)) = detect_stanza_label(&section) {
                // Strip the actual first line (the label) from the body
                let rest: Vec<&str> = section
                    .lines()
                    .skip(1)
                    .map(|l| l.trim())
                    .filter(|l| !l.is_empty())
                    .collect();
                (Some(display), rest)
            } else {
                (None, section.lines().map(|l| l.trim()).collect())
            };

        let content = if let Some(label) = &label_display {
            let body_html = body_lines
                .iter()
                .map(|l| format!("<div class=\"verse-line\">{}</div>", l))
                .collect::<Vec<_>>()
                .join("");
            format!("<div class=\"stanza-wrap\"><div class=\"stanza-label\">{}</div><div class=\"stanza-body\">{}</div></div>", label, body_html)
        } else {
            body_lines
                .iter()
                .map(|l| format!("<div class=\"verse-line\">{}</div>", l))
                .collect::<Vec<_>>()
                .join("")
        };

        slides.push(Slide {
            id: format!("{}-slide-{}", title, slide_count),
            slide_type: SlideType::Song,
            title: Some(title.to_string()),
            content,
            media_path: None,
            background_path: None,
            order_index: slide_count - 1,
            created_at: chrono::Utc::now(),
        });
    }

    slides
}

/// Detects a stanza label at the beginning of a section.
/// Returns (actual_first_line_text, display_label) if found, or None.
/// The first element is the raw first line to strip from content;
/// the second is what to show in the label UI.
fn detect_stanza_label(section: &str) -> Option<(&str, String)> {
    let first_line = section.lines().next()?.trim();

    // Match: "Stanza N", "Stanza N."
    if first_line.starts_with("Stanza ") {
        return Some((first_line, first_line.to_string()));
    }

    // Match: "Verse N", "Verse N."
    if first_line.starts_with("Verse ") {
        return Some((first_line, first_line.to_string()));
    }

    // Match: "[Chorus]", "[Bridge]", "[Intro]", etc.
    if first_line.starts_with('[') && first_line.ends_with(']') {
        return Some((first_line, first_line.to_string()));
    }

    // Match: "N." or "N)" (stanza number with trailing dot/paren)
    if let Some(rest) = first_line.strip_suffix('.') {
        if rest.parse::<i32>().is_ok() {
            return Some((first_line, format!("Stanza {}", rest)));
        }
    }
    if let Some(rest) = first_line.strip_suffix(')') {
        if rest.parse::<i32>().is_ok() {
            return Some((first_line, format!("Stanza {}", rest)));
        }
    }

    // Match: plain "N" (number alone, no dot or paren)
    if let Ok(n) = first_line.parse::<i32>() {
        return Some((first_line, format!("Stanza {}", n)));
    }

    None
}

pub fn generate_bible_slide(book: &str, chapter: i32, verses: &str, text: &str) -> Slide {
    let reference = format!("{} {}:{}", book, chapter, verses);
    
    Slide {
        id: format!("bible-{}-{}-{}", book, chapter, verses),
        slide_type: SlideType::Bible,
        title: Some(reference.clone()),
        content: format!("{}\n\n{}", text, reference),
        media_path: None,
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    }
}

pub fn generate_text_slide(title: Option<String>, content: String) -> Slide {
    Slide {
        id: uuid::Uuid::new_v4().to_string(),
        slide_type: SlideType::Text,
        title,
        content,
        media_path: None,
        background_path: None,
        order_index: 0,
        created_at: chrono::Utc::now(),
    }
}
