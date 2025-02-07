use regex::Regex;

pub fn process_message(message: &str, words_cache: &[String]) -> Vec<String> {
    let re = Regex::new(r"(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http(.*)|speak)\b").unwrap();
    let filtered = re.replace_all(message, "").to_string();

    let text_only = filtered.trim();
    let mut words: Vec<String> = text_only
        .split_whitespace()
        .map(String::from)
        .filter(|w| !w.is_empty())
        .collect();

    // Remove cached words
    words.retain(|word| !words_cache.contains(word));

    // Sort by vowel count if there are multiple words
    if words.len() > 1 {
        let vowel_re = Regex::new(r"[aeiouy]{1,2}").unwrap();
        words.sort_by(|a, b| {
            let a_vowel_count = vowel_re.find_iter(a).count();
            let b_vowel_count = vowel_re.find_iter(b).count();
            b_vowel_count.cmp(&a_vowel_count)
        });
    }

    words
}
