const form = document.getElementById("humanizer-form");
const inputText = document.getElementById("input-text");
const toneSelect = document.getElementById("tone");
const lengthSelect = document.getElementById("length");
const readabilitySelect = document.getElementById("readability");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const outputWrap = document.getElementById("output-wrap");
const outputText = document.getElementById("output-text");
const toolError = document.getElementById("tool-error");
const metaWords = document.getElementById("meta-words");
const metaChars = document.getElementById("meta-characters");
const metaReading = document.getElementById("meta-reading");

const riskyPatterns = [
  /bypass\s+ai/i,
  /evade\s+detector/i,
  /plagiarism/i,
  /turnitin/i,
  /undetectable\s+ai/i,
];

const phraseMap = [
  ["in order to", "to"],
  ["utilize", "use"],
  ["very important", "key"],
  ["it is worth noting that", ""],
  ["in conclusion", "to sum up"],
  ["furthermore", "also"],
  ["moreover", "on top of that"],
];

const contractionMap = [
  ["do not", "don't"],
  ["cannot", "can't"],
  ["will not", "won't"],
  ["it is", "it's"],
  ["that is", "that's"],
];

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]?/g) || [];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function applyPhraseRewrites(text) {
  let result = text;
  for (const [from, to] of phraseMap) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), to);
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function applyTone(sentence, tone) {
  let updated = sentence;
  if (tone === "friendly") {
    for (const [from, to] of contractionMap) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      updated = updated.replace(new RegExp(`\\b${escaped}\\b`, "gi"), to);
    }
    if (!/[!?]$/.test(updated)) {
      updated += ".";
    }
  } else if (tone === "professional") {
    updated = updated
      .replace(/\b(gonna|wanna|kinda)\b/gi, "going to")
      .replace(/\b(awesome|cool)\b/gi, "effective");
  } else if (tone === "concise") {
    updated = updated
      .replace(/\b(really|very|quite|basically)\b/gi, "")
      .replace(/\s{2,}/g, " ");
  }
  return updated.trim();
}

function applyReadability(sentence, readability) {
  if (readability === "simple") {
    return sentence
      .replace(/\bapproximately\b/gi, "about")
      .replace(/\badditional\b/gi, "extra")
      .replace(/\btherefore\b/gi, "so");
  }
  if (readability === "advanced") {
    return sentence
      .replace(/\bhelp\b/gi, "assist")
      .replace(/\bshow\b/gi, "demonstrate")
      .replace(/\buseful\b/gi, "valuable");
  }
  return sentence;
}

function applyLength(sentences, mode) {
  if (mode === "shorter") {
    return sentences
      .map((s) => s.replace(/,\s*which[^.?!]*/gi, ""))
      .filter(Boolean)
      .slice(0, Math.max(1, Math.ceil(sentences.length * 0.75)));
  }
  if (mode === "longer") {
    const expanded = [...sentences];
    if (expanded.length > 0) {
      expanded.push("It keeps your original meaning while improving flow and readability.");
    }
    return expanded;
  }
  return sentences;
}

function humanize(rawText, tone, lengthMode, readability) {
  const normalized = normalizeText(rawText);
  const rewritten = applyPhraseRewrites(normalized);
  let sentences = splitSentences(rewritten);

  sentences = sentences.map((s) => applyReadability(applyTone(s, tone), readability));
  sentences = applyLength(sentences, lengthMode);

  const connectors = ["Also", "Next", "Plus", "On top of that"];
  const adjusted = sentences.map((sentence, idx) => {
    if (idx > 0 && idx % 2 === 1 && !/^(Also|Next|Plus|On top of that)\b/i.test(sentence)) {
      return `${connectors[(idx - 1) % connectors.length]}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
    }
    return sentence;
  });

  return adjusted.join(" ").replace(/\s{2,}/g, " ").trim();
}

function hasRiskyIntent(text) {
  return riskyPatterns.some((pattern) => pattern.test(text));
}

function showError(message) {
  toolError.textContent = message;
  toolError.classList.remove("hidden");
}

function hideError() {
  toolError.textContent = "";
  toolError.classList.add("hidden");
}

function updateMeta(text) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const readingMinutes = Math.max(1, Math.round(words / 200));
  metaWords.textContent = `${words} words`;
  metaChars.textContent = `${chars} characters`;
  metaReading.textContent = `${readingMinutes} min read`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  hideError();

  const source = inputText.value.trim();
  if (!source) {
    showError("Paste some text first.");
    return;
  }

  if (hasRiskyIntent(source)) {
    showError("This tool blocks requests that ask to bypass detectors or academic integrity systems.");
    return;
  }

  const output = humanize(
    source,
    toneSelect.value,
    lengthSelect.value,
    readabilitySelect.value
  );

  outputText.value = output;
  outputWrap.classList.remove("hidden");
  updateMeta(output);
});

clearBtn.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  outputWrap.classList.add("hidden");
  hideError();
  updateMeta("");
});

copyBtn.addEventListener("click", async () => {
  if (!outputText.value.trim()) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy Result";
    }, 1200);
  } catch {
    showError("Clipboard blocked. Copy manually from the result box.");
  }
});

updateMeta("");
