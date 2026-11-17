let questions = [];
let filtered = [];
let currentIndex = 0;
let answered = JSON.parse(localStorage.getItem('aplus-answered') || '{}');
let correctCount = Object.values(answered).filter(a => a.correct).length;
let totalAnswered = Object.keys(answered).length;

async function init() {
  try {
    const res = await fetch('questions.json');
    questions = await res.json();
    filtered = [...questions];
    shuffle(filtered);
    render();
    updateStats();
  } catch (e) {
    document.getElementById('question-area').innerHTML = '<p>Failed to load questions. Check your connection or try refreshing.</p>';
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Filters
  document.getElementById('filters').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#filters button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const filter = e.target.dataset.filter;
    if (filter === 'all') {
      filtered = [...questions];
    } else if (filter === '1' || filter === '2') {
      filtered = questions.filter(q => q.core === filter);
    } else {
      filtered = questions.filter(q => q.category === filter);
    }
    shuffle(filtered);
    currentIndex = 0;
    render();
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Reset all progress?')) {
      answered = {};
      localStorage.removeItem('aplus-answered');
      correctCount = 0;
      totalAnswered = 0;
      updateStats();
      render();
    }
  });

  document.getElementById('submit').addEventListener('click', submitAnswer);
  document.getElementById('next').addEventListener('click', nextQuestion);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function updateStats() {
  const total = filtered.length;
  const answeredInFilter = filtered.filter(q => answered[q.id]).length;
  document.getElementById('progress').textContent = `${answeredInFilter} / ${total} answered`;
  const pct = totalAnswered ? Math.round((correctCount / totalAnswered) * 100) : 0;
  document.getElementById('score').textContent = `Score: ${pct}%`;
}

function render() {
  const q = filtered[currentIndex];
  if (!q) {
    document.getElementById('question-area').innerHTML = '<p>No questions match this filter. Try another category.</p>';
    document.getElementById('submit').classList.add('hidden');
    document.getElementById('next').classList.add('hidden');
    return;
  }

  const area = document.getElementById('question-area');
  const feedback = document.getElementById('feedback');
  feedback.classList.add('hidden');
  feedback.innerHTML = '';
  document.getElementById('submit').classList.remove('hidden');
  document.getElementById('submit').disabled = true;
  document.getElementById('next').classList.add('hidden');

  let html = `<div class="category-badge">${q.category} • Core ${q.core}</div>`;
  html += `<div class="question-text">${q.question}</div>`;

  if (q.type === 'mcq') {
    html += '<div class="options">';
    q.options.forEach((opt, i) => {
      html += `<div class="option" data-index="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>`;
    });
    html += '</div>';
  } else if (q.type === 'dragdrop') {
    html += '<p>Drag the items into the correct order/targets:</p>';
    html += '<div class="drag-area" id="drag-items">';
    q.items.forEach((item, i) => {
      html += `<div class="draggable" draggable="true" data-index="${i}">${item}</div>`;
    });
    html += '</div><div id="drop-targets" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;">';
    q.targets.forEach((t, i) => {
      html += `<div class="drop-target" data-index="${i}">${t}</div>`;
    });
    html += '</div>';
  } else if (q.type === 'simulation') {
    html += `<div style="background:#0f172a;padding:1rem;border-radius:0.5rem;font-family:monospace;margin-bottom:1rem;">${q.prompt || 'C:\\>'}</div>`;
    html += `<input type="text" class="cli-input" id="cli-input" placeholder="Type the command and press Enter or Submit" autocomplete="off">`;
  }

  area.innerHTML = html;

  // Event listeners for interaction
  if (q.type === 'mcq') {
    area.querySelectorAll('.option').forEach(el => {
      el.addEventListener('click', () => {
        area.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('submit').disabled = false;
      });
    });
  } else if (q.type === 'dragdrop') {
    setupDragDrop();
  } else if (q.type === 'simulation') {
    const input = document.getElementById('cli-input');
    input.addEventListener('input', () => {
      document.getElementById('submit').disabled = !input.value.trim();
    });
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') submitAnswer();
    });
  }
}

function setupDragDrop() {
  const items = document.querySelectorAll('.draggable');
  const targets = document.querySelectorAll('.drop-target');

  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', item.dataset.index);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
  });

  targets.forEach(target => {
    target.addEventListener('dragover', e => e.preventDefault());
    target.addEventListener('drop', e => {
      e.preventDefault();
      const index = e.dataTransfer.getData('text/plain');
      const item = document.querySelector(`.draggable[data-index="${index}"]`);
      if (item && !target.querySelector('.draggable')) {
        target.appendChild(item);
        checkDragComplete();
      }
    });
  });

  // Also allow dropping back to items area
  document.getElementById('drag-items').addEventListener('dragover', e => e.preventDefault());
  document.getElementById('drag-items').addEventListener('drop', e => {
    e.preventDefault();
    const index = e.dataTransfer.getData('text/plain');
    const item = document.querySelector(`.draggable[data-index="${index}"]`);
    if (item) document.getElementById('drag-items').appendChild(item);
    checkDragComplete();
  });
}

function checkDragComplete() {
  const targets = document.querySelectorAll('.drop-target');
  const allFilled = Array.from(targets).every(t => t.querySelector('.draggable'));
  document.getElementById('submit').disabled = !allFilled;
}

function submitAnswer() {
  const q = filtered[currentIndex];
  let isCorrect = false;
  let userAnswer = null;

  if (q.type === 'mcq') {
    const selected = document.querySelector('.option.selected');
    if (!selected) return;
    userAnswer = parseInt(selected.dataset.index);
    isCorrect = q.correct.includes(userAnswer);
    document.querySelectorAll('.option').forEach((opt, i) => {
      if (q.correct.includes(i)) opt.classList.add('correct');
      else if (i === userAnswer) opt.classList.add('incorrect');
    });
  } else if (q.type === 'dragdrop') {
    const mapping = [];
    document.querySelectorAll('.drop-target').forEach((t, i) => {
      const item = t.querySelector('.draggable');
      mapping[i] = item ? parseInt(item.dataset.index) : -1;
    });
    isCorrect = mapping.every((m, i) => m === q.correctMapping[i]);
    userAnswer = mapping;
  } else if (q.type === 'simulation') {
    const input = document.getElementById('cli-input').value.trim().toLowerCase();
    userAnswer = input;
    isCorrect = q.accepted.some(a => a.toLowerCase() === input);
  }

  // Feedback
  const feedback = document.getElementById('feedback');
  feedback.classList.remove('hidden', 'correct', 'incorrect');
  feedback.classList.add(isCorrect ? 'correct' : 'incorrect');

  let fb = `<h3>${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</h3>`;
  fb += `<p><strong>Explanation:</strong> ${q.explanation}</p>`;

  if (!isCorrect && q.type === 'mcq' && q.wrongExplanations && q.wrongExplanations[userAnswer]) {
    fb += `<div class="explanation-detail"><strong>Why your answer is wrong:</strong> ${q.wrongExplanations[userAnswer]}</div>`;
  }
  if (q.type === 'mcq') {
    q.options.forEach((opt, i) => {
      if (!q.correct.includes(i) && q.wrongExplanations && q.wrongExplanations[i]) {
        fb += `<div class="explanation-detail"><strong>${String.fromCharCode(65 + i)} is wrong:</strong> ${q.wrongExplanations[i]}</div>`;
      }
    });
  }

  feedback.innerHTML = fb;

  // Save progress
  if (!answered[q.id]) {
    totalAnswered++;
    if (isCorrect) correctCount++;
  }
  answered[q.id] = { correct: isCorrect, answer: userAnswer };
  localStorage.setItem('aplus-answered', JSON.stringify(answered));
  updateStats();

  document.getElementById('submit').classList.add('hidden');
  document.getElementById('next').classList.remove('hidden');
}

function nextQuestion() {
  currentIndex = (currentIndex + 1) % filtered.length;
  render();
}

init();
