// ==========================================
// 1. Моделі (Класи ES6+)
// ==========================================

class TextAnalyzer {
  constructor(text = "") {
    this.text = text;
  }

  setText(text) {
    this.text = text;
  }

  getCharCount() {
    return this.text.length;
  }

  getWordCount() {
    const words = this.text.trim().match(/[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]+/g);
    return words ? words.length : 0;
  }

  getSentenceCount() {
    const sentences = this.text.trim().split(/[.!?]+/).filter(Boolean);
    return sentences.length;
  }

  getFrequencyDictionary() {
    const words = this.text.toLowerCase().match(/[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]+/g);
    if (!words) return {};

    const freqMap = {};
    words.forEach(word => {
      freqMap[word] = (freqMap[word] || 0) + 1;
    });

    return freqMap;
  }

  getHighlightedText(query) {
    if (!query || !this.text) return this.text;
    
    // Экранирование спецсимволов для безопасного RegExp
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${escapedQuery})`, 'gi');
    
    return this.text.replace(pattern, '<mark>$1</mark>');
  }
}

class HistoryManager {
  constructor(storageKey = 'text_analyzer_history') {
    this.storageKey = storageKey;
    this.history = this.loadHistory();
  }

  loadHistory() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : [];
  }

  saveHistory() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.history));
  }

  addEntry(text, stats) {
    const entry = {
      id: crypto.randomUUID(),
      text: text,
      charCount: stats.charCount,
      wordCount: stats.wordCount,
      sentenceCount: stats.sentenceCount,
      date: new Date().toLocaleString('uk-UA')
    };

    this.history.unshift(entry);
    this.saveHistory();
    return entry;
  }

  removeEntry(id) {
    this.history = this.history.filter(item => item.id !== id);
    this.saveHistory();
  }

  getEntryById(id) {
    return this.history.find(item => item.id === id);
  }

  searchHistory(query) {
    if (!query) return this.history;
    const pattern = new RegExp(query, 'i');
    return this.history.filter(item => pattern.test(item.text));
  }
}

// ==========================================
// 2. Ініціалізація та DOM-елементи
// ==========================================

const analyzer = new TextAnalyzer();
const historyManager = new HistoryManager();

const textForm = document.querySelector('#text-form');
const textInput = document.querySelector('#text-input');
const inputError = document.querySelector('#input-error');

const charCountEl = document.querySelector('#char-count');
const wordCountEl = document.querySelector('#word-count');
const sentenceCountEl = document.querySelector('#sentence-count');

const searchInput = document.querySelector('#search-input');
const highlightedTextEl = document.querySelector('#highlighted-text');
const dictTbody = document.querySelector('#dict-tbody');

const historySearchInput = document.querySelector('#history-search');
const historyList = document.querySelector('#history-list');

// ==========================================
// 3. Функції оновлення UI (Рендеринг)
// ==========================================

function updateAnalysis() {
  const text = textInput.value;
  analyzer.setText(text);

  // Оновлення метрик
  charCountEl.textContent = analyzer.getCharCount();
  wordCountEl.textContent = analyzer.getWordCount();
  sentenceCountEl.textContent = analyzer.getSentenceCount();

  // Оновлення підсвічування
  const searchQuery = searchInput.value.trim();
  highlightedTextEl.innerHTML = text ? analyzer.getHighlightedText(searchQuery) : "Текст відсутній...";

  // Оновлення частотного словника
  renderDictionary(analyzer.getFrequencyDictionary());
}

function renderDictionary(freqMap) {
  dictTbody.innerHTML = "";
  const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    dictTbody.innerHTML = `<tr><td colspan="2">Введіть текст для побудови словника</td></tr>`;
    return;
  }

  entries.forEach(([word, count]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${word}</td><td>${count}</td>`;
    dictTbody.append(tr);
  });
}

function renderHistory(items) {
  historyList.innerHTML = "";

  if (items.length === 0) {
    historyList.innerHTML = `<li class="history-item">Записи відсутні</li>`;
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.dataset.id = item.id;

    const shortText = item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text;

    li.innerHTML = `
      <div>
        <strong>"${shortText}"</strong>
        <br>
        <small>${item.date} | Слів: ${item.wordCount}, Символів: ${item.charCount}</small>
      </div>
      <div class="history-actions">
        <button class="btn btn-secondary load-btn">Завантажити</button>
        <button class="btn btn-danger delete-btn">Видалити</button>
      </div>
    `;

    historyList.append(li);
  });
}

// ==========================================
// 4. Обробники подій
// ==========================================

// Аналіз у реальному часі (подія input)
textInput.addEventListener('input', () => {
  if (textInput.value.trim().length > 0) {
    textInput.classList.remove('invalid');
    inputError.textContent = '';
  }
  updateAnalysis();
});

// Пошук і підсвічування фрагмента
searchInput.addEventListener('input', () => {
  updateAnalysis();
});

// Валідація та збереження в історію (подія submit)
textForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textInput.value.trim();

  // Валідація через RegExp (мінімум 3 символи)
  if (!/^.{3,}$/s.test(text)) {
    textInput.classList.add('invalid');
    inputError.textContent = 'Текст повинен містити щонайменше 3 символи!';
    return;
  }

  textInput.classList.remove('invalid');
  inputError.textContent = '';

  const stats = {
    charCount: analyzer.getCharCount(),
    wordCount: analyzer.getWordCount(),
    sentenceCount: analyzer.getSentenceCount()
  };

  historyManager.addEntry(text, stats);
  renderHistory(historyManager.history);
});

// Делегування подій для кнопок історії (Load / Delete)
historyList.addEventListener('click', (e) => {
  const itemEl = e.target.closest('.history-item');
  if (!itemEl) return;

  const id = itemEl.dataset.id;

  if (e.target.classList.contains('delete-btn')) {
    historyManager.removeEntry(id);
    renderHistory(historyManager.searchHistory(historySearchInput.value.trim()));
  } else if (e.target.classList.contains('load-btn')) {
    const entry = historyManager.getEntryById(id);
    if (entry) {
      textInput.value = entry.text;
      updateAnalysis();
    }
  }
});

// Пошук в історії в реальному часі
historySearchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  const filtered = historyManager.searchHistory(query);
  renderHistory(filtered);
});

// Первинна ініціалізація під час завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
  renderHistory(historyManager.history);
  updateAnalysis();
});