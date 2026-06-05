// --- Data Structures ---

// BST Node
class BSTNode {
  constructor(question) {
    this.id = question.id;
    this.question = question;
    this.left = null;
    this.right = null;
  }
}

// Binary Search Tree
class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(question) {
    const newNode = new BSTNode(question);
    if (!this.root) {
      this.root = newNode;
    } else {
      this.insertNode(this.root, newNode);
    }
  }

  insertNode(node, newNode) {
    if (newNode.id < node.id) {
      if (!node.left) {
        node.left = newNode;
      } else {
        this.insertNode(node.left, newNode);
      }
    } else if (newNode.id > node.id) {
      if (!node.right) {
        node.right = newNode;
      } else {
        this.insertNode(node.right, newNode);
      }
    } else {
      // Overwrite duplicate ID
      node.question = newNode.question;
    }
  }

  // Preorder Traversal: Root -> Left -> Right
  preorder() {
    const result = [];
    this.traversePreorder(this.root, result);
    return result;
  }

  traversePreorder(node, result) {
    if (node) {
      result.push(node.question);
      this.traversePreorder(node.left, result);
      this.traversePreorder(node.right, result);
    }
  }

  // Inorder Traversal: Left -> Root -> Right
  inorder() {
    const result = [];
    this.traverseInorder(this.root, result);
    return result;
  }

  traverseInorder(node, result) {
    if (node) {
      this.traverseInorder(node.left, result);
      result.push(node.question);
      this.traverseInorder(node.right, result);
    }
  }
}

// --- Global Application State ---
let questionsList = []; // Raw parsed questions list (maintains user edit states)
let dbConnected = false;

// --- Helper Utilities ---

// Convert Bengali numerals (১, ২, ৩...) to English (1, 2, 3...)
function bengaliToEnglishDigit(str) {
  const banglaDigits = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return String(str).replace(/[০-৯]/g, d => banglaDigits[d]);
}

// Convert English numerals to Bengali
function englishToBengaliDigit(str) {
  const engDigits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return String(str).replace(/[0-9]/g, d => engDigits[d]);
}

// Show CSS Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  // Close toast event listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto remove toast after 4.5 seconds
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// --- MCQ Parsing Logic ---
function parseInputText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsedQuestions = [];
  const answersMap = {}; // Question ID -> Correct Option Name (e.g. Option A)
  
  // Keywords identifying the start of the Answer Key section
  const answerKeyKeywords = ["উত্তরমালা", "answer key", "answer keys", "उत्तरमाला", "answers", "উত্তর", "উত্তরঃ", "উত্তর :"];
  
  let inAnswerKeySection = false;
  
  // Regex configurations
  // Question prefix e.g. "১। ", "1. ", "১. ", "12|" etc.
  const qPattern = /^\s*([১-৯০-৯\d]+)\s*[।\.)\-\|]\s*(.*)$/;
  
  // Option prefixes
  const optAPattern = /^\s*([কAa])\s*[।\.)\-\s]\s*(.*)$/;
  const optBPattern = /^\s*([খBb])\s*[।\.)\-\s]\s*(.*)$/;
  const optCPattern = /^\s*([গCc])\s*[।\.)\-\s]\s*(.*)$/;
  const optDPattern = /^\s*([ঘDd])\s*[।\.)\-\s]\s*(.*)$/;

  let currentQuestion = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we hit the Answer Key section marker
    const isKeyHeader = answerKeyKeywords.some(kw => line.toLowerCase().includes(kw));
    if (isKeyHeader) {
      inAnswerKeySection = true;
      continue; // Skip the header line itself
    }

    if (inAnswerKeySection) {
      // Process Answer Key line
      // Format: "১। গ. ১৯৬৫ সালে" or "1. C. Tokyo" or "১। গ"
      const match = line.match(/^\s*([১-৯০-৯\d]+)\s*[।\.)\-\|]\s*(.*)$/);
      if (match) {
        const qId = parseInt(bengaliToEnglishDigit(match[1]), 10);
        const rest = match[2].trim();
        let selectedOption = null;
        const lowerRest = rest.toLowerCase();

        // Check if explicitly contains Option label
        if (lowerRest.includes('option a') || lowerRest.includes('option_a')) {
          selectedOption = 'Option A';
        } else if (lowerRest.includes('option b') || lowerRest.includes('option_b')) {
          selectedOption = 'Option B';
        } else if (lowerRest.includes('option c') || lowerRest.includes('option_c')) {
          selectedOption = 'Option C';
        } else if (lowerRest.includes('option d') || lowerRest.includes('option_d')) {
          selectedOption = 'Option D';
        } else {
          // Check for single character prefix (ক/খ/গ/ঘ/A/B/C/D)
          const prefixMatch = rest.match(/^\s*([কখগঘA-Da-d])\s*([।\.)\-\s]|$)/);
          if (prefixMatch) {
            const marker = prefixMatch[1].toUpperCase();
            if (marker === 'ক' || marker === 'A') selectedOption = 'Option A';
            else if (marker === 'খ' || marker === 'B') selectedOption = 'Option B';
            else if (marker === 'গ' || marker === 'C') selectedOption = 'Option C';
            else if (marker === 'ঘ' || marker === 'D') selectedOption = 'Option D';
          }
        }

        if (selectedOption) {
          answersMap[qId] = selectedOption;
        }
      }
      continue;
    }

    // Process Question Section lines
    const optAMatch = line.match(optAPattern);
    const optBMatch = line.match(optBPattern);
    const optCMatch = line.match(optCPattern);
    const optDMatch = line.match(optDPattern);
    const qMatch = line.match(qPattern);

    if (optAMatch) {
      if (currentQuestion) currentQuestion.optionA = optAMatch[2].trim();
    } else if (optBMatch) {
      if (currentQuestion) currentQuestion.optionB = optBMatch[2].trim();
    } else if (optCPattern.test(line) && optCMatch) {
      // Small defensive check for regex overlaps
      if (currentQuestion) currentQuestion.optionC = optCMatch[2].trim();
    } else if (optDMatch) {
      if (currentQuestion) currentQuestion.optionD = optDMatch[2].trim();
    } else if (qMatch) {
      // Save previous question
      if (currentQuestion) {
        parsedQuestions.push(currentQuestion);
      }
      // Start new question block
      const rawId = qMatch[1];
      const englishId = parseInt(bengaliToEnglishDigit(rawId), 10);
      currentQuestion = {
        id: englishId,
        rawId: rawId,
        question: qMatch[2].trim(),
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        answer: null
      };
    } else {
      // Text continuation
      if (currentQuestion) {
        if (!currentQuestion.optionA) {
          currentQuestion.question += ' ' + line;
        } else if (!currentQuestion.optionB) {
          currentQuestion.optionA += ' ' + line;
        } else if (!currentQuestion.optionC) {
          currentQuestion.optionB += ' ' + line;
        } else if (!currentQuestion.optionD) {
          currentQuestion.optionC += ' ' + line;
        } else {
          currentQuestion.optionD += ' ' + line;
        }
      }
    }
  }

  // Push final question block
  if (currentQuestion) {
    parsedQuestions.push(currentQuestion);
  }

  // Map correct answers from Answer Key
  parsedQuestions.forEach(q => {
    if (answersMap[q.id]) {
      q.answer = answersMap[q.id];
    }
  });

  return parsedQuestions;
}

// --- Render Table & UI Update ---

function renderTable() {
  const table = document.getElementById('parsedTable');
  const emptyState = document.getElementById('tableEmptyState');
  const tableBody = document.getElementById('tableBody');
  const exportGroup = document.getElementById('exportGroup');
  const btnSaveDB = document.getElementById('btnSaveDB');

  if (questionsList.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
    exportGroup.style.display = 'none';
    btnSaveDB.disabled = true;
    
    // Update Stats
    document.getElementById('statTotal').innerText = '0';
    document.getElementById('statValid').innerText = '0';
    document.getElementById('statWarnings').innerText = '0';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';
  exportGroup.style.display = 'flex';
  btnSaveDB.disabled = !dbConnected; // Only enable DB button if backend is connected

  // Process Sorting via BST
  const sortOption = document.getElementById('sortSelector').value;
  let displayList = [];

  if (sortOption === 'preorder' || sortOption === 'inorder') {
    const bst = new BinarySearchTree();
    questionsList.forEach(q => bst.insert(q));
    displayList = sortOption === 'preorder' ? bst.preorder() : bst.inorder();
  } else {
    displayList = [...questionsList]; // Maintain user insertion order
  }

  // Update Stats
  let validCount = 0;
  let warningCount = 0;

  tableBody.innerHTML = '';
  displayList.forEach((q, index) => {
    const isQuestionValid = q.id && q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.answer;
    let statusBadge = '';
    
    if (isQuestionValid) {
      statusBadge = '<span class="badge badge-success">Valid</span>';
      validCount++;
    } else {
      statusBadge = '<span class="badge badge-warning">Missing Info</span>';
      warningCount++;
    }

    const row = document.createElement('tr');
    row.className = 'animate-row';
    row.style.animationDelay = `${index * 0.05}s`;
    
    // Build options list label mapping
    const answerLabel = q.answer ? q.answer.replace('Option ', '') : 'None';

    row.innerHTML = `
      <td style="font-weight: 600;">${q.id}</td>
      <td title="${q.question}">${q.question}</td>
      <td class="option-cell" title="${q.optionA}">${q.optionA || '<em style="color:#ef4444;">Missing</em>'}</td>
      <td class="option-cell" title="${q.optionB}">${q.optionB || '<em style="color:#ef4444;">Missing</em>'}</td>
      <td class="option-cell" title="${q.optionC}">${q.optionC || '<em style="color:#ef4444;">Missing</em>'}</td>
      <td class="option-cell" title="${q.optionD}">${q.optionD || '<em style="color:#ef4444;">Missing</em>'}</td>
      <td><span class="badge ${q.answer ? 'badge-info' : 'badge-danger'}">${answerLabel}</span></td>
      <td>${statusBadge}</td>
      <td style="text-align: center;">
        <div class="action-buttons">
          <button class="action-btn edit-btn" onclick="openEditModal(${q.id})" title="Edit Question">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn delete-btn" onclick="deleteQuestion(${q.id})" title="Delete Question">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.getElementById('statTotal').innerText = questionsList.length;
  document.getElementById('statValid').innerText = validCount;
  document.getElementById('statWarnings').innerText = warningCount;
}

// --- Edit Modal Controls ---

window.openEditModal = function(qId) {
  const q = questionsList.find(item => item.id === qId);
  if (!q) return;

  document.getElementById('modalIndex').value = qId;
  document.getElementById('modalId').value = q.id;
  document.getElementById('modalQuestion').value = q.question;
  document.getElementById('modalOptA').value = q.optionA;
  document.getElementById('modalOptB').value = q.optionB;
  document.getElementById('modalOptC').value = q.optionC;
  document.getElementById('modalOptD').value = q.optionD;
  document.getElementById('modalAnswer').value = q.answer || "";

  document.getElementById('editModal').classList.add('active');
};

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

window.deleteQuestion = function(qId) {
  const index = questionsList.findIndex(item => item.id === qId);
  if (index !== -1) {
    questionsList.splice(index, 1);
    renderTable();
    showToast('Question deleted successfully.', 'warning');
  }
};

// --- Export Functions ---

function exportJSON() {
  if (questionsList.length === 0) return;
  const jsonContent = JSON.stringify(questionsList, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `parsed_mcqs_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('JSON exported successfully.');
}

function exportCSV() {
  if (questionsList.length === 0) return;
  
  // Headers match table schema
  let csvContent = "ID,Question,Option A,Option B,Option C,Option D,Answer\n";
  
  questionsList.forEach(q => {
    // Escape quotes in texts
    const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;
    csvContent += `${q.id},${escape(q.question)},${escape(q.optionA)},${escape(q.optionB)},${escape(q.optionC)},${escape(q.optionD)},${escape(q.answer)}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `parsed_mcqs_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully.');
}

// --- Server & DB Synchronization ---

async function checkDbConnection() {
  const badge = document.getElementById('dbStatusBadge');
  const dot = document.getElementById('dbStatusDot');
  const text = document.getElementById('dbStatusText');

  try {
    const res = await fetch('/api/db-status');
    const data = await res.json();
    
    if (data.connected) {
      dbConnected = true;
      dot.className = 'status-dot connected';
      text.innerText = 'Database Connected';
      // If questions are present, enable the save button
      if (questionsList.length > 0) {
        document.getElementById('btnSaveDB').disabled = false;
      }
    } else {
      dbConnected = false;
      dot.className = 'status-dot';
      text.innerText = 'DB Offline (Readonly)';
      console.warn('Database connection check failed:', data.error);
    }
  } catch (err) {
    dbConnected = false;
    dot.className = 'status-dot';
    text.innerText = 'DB Unreachable (Readonly)';
    console.error('Server status unreachable:', err);
  }
}

async function saveToDatabase() {
  if (questionsList.length === 0 || !dbConnected) return;

  const btn = document.getElementById('btnSaveDB');
  const userId = parseInt(document.getElementById('userIdInput').value, 10) || 1;
  const originalText = btn.innerHTML;

  // Add userId to questions payload
  const payload = questionsList.map(q => ({
    ...q,
    userId: userId
  }));

  try {
    btn.disabled = true;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Saving...`;
    
    // Add simple CSS spinner animation to buttons
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; }`;
    document.head.appendChild(style);

    const res = await fetch('/api/save-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: payload })
    });

    const data = await res.json();
    document.getElementById('spinner-style')?.remove();

    if (data.success) {
      showToast(data.message || 'Questions saved to Neon DB successfully!', 'success');
    } else {
      showToast(`Error: ${data.error}`, 'danger');
    }
  } catch (err) {
    showToast('Failed to connect to database API.', 'danger');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Load questions from Neon PostgreSQL DB
async function loadQuestionsFromDb() {
  try {
    const res = await fetch('/api/questions');
    const data = await res.json();
    if (data.success && data.questions && data.questions.length > 0) {
      questionsList = data.questions;
      renderTable();
      showToast(`Loaded ${data.questions.length} questions from database.`, 'info');
      return true;
    }
  } catch (err) {
    console.error('Error fetching questions from DB:', err);
  }
  return false;
}

// Theme Toggle System
function initThemeToggle() {
  const toggleBtn = document.getElementById('btnThemeToggle');
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  const toggleText = document.getElementById('themeToggleText');

  function setTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      sunIcon.style.display = 'block'; // Show sun icon in light mode to let user switch to dark
      moonIcon.style.display = 'none';
      toggleText.innerText = 'Dark Mode';
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block'; // Show moon icon in dark mode to let user switch to light
      toggleText.innerText = 'Light Mode';
      localStorage.setItem('theme', 'dark');
    }
  }

  // Load saved theme or check system preferences
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const initialTheme = savedTheme || (systemPrefersLight ? 'light' : 'dark');
  setTheme(initialTheme);

  toggleBtn.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
    showToast(`Switched to ${isLight ? 'Dark' : 'Light'} theme.`);
  });
}

// --- Document Ready / Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Theme Toggler
  initThemeToggle();

  // Check Database connection on start
  await checkDbConnection();

  // Try loading saved questions from PostgreSQL DB first
  const loaded = await loadQuestionsFromDb();

  // If no questions in DB, parse default content as onboarding helper
  if (!loaded) {
    const defaultText = document.getElementById('questionInput').value;
    if (defaultText.trim()) {
      const parsed = parseInputText(defaultText);
      if (parsed.length > 0) {
        questionsList = parsed;
        renderTable();
      }
    }
  }

  // Parse Action
  document.getElementById('btnParse').addEventListener('click', () => {
    const text = document.getElementById('questionInput').value;
    if (!text.trim()) {
      showToast('Please paste some MCQ questions first.', 'danger');
      return;
    }

    const parsed = parseInputText(text);
    if (parsed.length === 0) {
      showToast('No questions could be matched. Please check format.', 'warning');
    } else {
      questionsList = parsed;
      renderTable();
      showToast(`Successfully parsed ${parsed.length} questions.`);
    }
  });

  // Save changes modal button
  document.getElementById('btnModalSave').addEventListener('click', () => {
    const originalId = parseInt(document.getElementById('modalIndex').value, 10);
    const newId = parseInt(document.getElementById('modalId').value, 10);
    const qText = document.getElementById('modalQuestion').value.trim();
    const optA = document.getElementById('modalOptA').value.trim();
    const optB = document.getElementById('modalOptB').value.trim();
    const optC = document.getElementById('modalOptC').value.trim();
    const optD = document.getElementById('modalOptD').value.trim();
    const answer = document.getElementById('modalAnswer').value;

    if (!newId || !qText) {
      showToast('ID and Question content are required.', 'danger');
      return;
    }

    const questionIndex = questionsList.findIndex(item => item.id === originalId);
    if (questionIndex !== -1) {
      // Overwrite properties
      questionsList[questionIndex] = {
        id: newId,
        rawId: String(newId),
        question: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        answer: answer || null
      };
      
      closeEditModal();
      renderTable();
      showToast('Question details updated successfully.');
    }
  });

  // Modal close buttons
  document.getElementById('btnModalClose').addEventListener('click', closeEditModal);
  document.getElementById('btnModalCancel').addEventListener('click', closeEditModal);

  // Sorting Selector Event
  document.getElementById('sortSelector').addEventListener('change', renderTable);

  // Save to DB Action
  document.getElementById('btnSaveDB').addEventListener('click', saveToDatabase);

  // Reset Button Action
  document.getElementById('btnClear').addEventListener('click', () => {
    document.getElementById('questionInput').value = '';
    questionsList = [];
    renderTable();
    showToast('Form reset complete.', 'warning');
  });

  // Export Events
  document.getElementById('btnExportJSON').addEventListener('click', exportJSON);
  document.getElementById('btnExportCSV').addEventListener('click', exportCSV);
});
