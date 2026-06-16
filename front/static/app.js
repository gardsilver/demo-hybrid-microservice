/* eslint-env browser */
/* global io */

let socket = null;
let currentUsername = "";

/**
 * Инициализирует процесс REST-авторизации и подключает WebSocket при успехе.
 */
async function loginAndConnect() {
  const usernameInput = document.getElementById('username-input');
  const errorDiv = document.getElementById('auth-error');
  
  if (!usernameInput || !errorDiv) return;

  const username = usernameInput.value.trim();
  errorDiv.innerText = "";

  if (!username) {
    errorDiv.innerText = "Имя пользователя не может быть пустым";
    return;
  }

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();

    if (!response.ok) {
      errorDiv.innerText = data.message || "Доступ запрещен (Forbidden)";
      return;
    }

    currentUsername = username;
    
    // Переключаем блоки интерфейса
    document.getElementById('auth-block').style.display = 'none';
    document.getElementById('chat-block').style.display = 'block';
    
    const titleEl = document.getElementById('chat-title');
    if (titleEl) titleEl.innerText = `Чат: ${currentUsername}`;

    // Сразу выводим сообщение о старте сессии на клиенте
    appendSystemMessage(`Система: REST-авторизация успешна. Запуск сокета...`, '#d1a100');

    // Инициализируем WebSocket-соединение.
    socket = io({
      transports: ['websocket'],
      query: {
        'send-from': currentUsername
      }
    });

    setupSocketListeners();

  } catch (err) {
    errorDiv.innerText = "Ошибка сети при попытке входа через /api/auth";
  }
}

/**
 * Регистрирует подписки на сетевые события и каналы ответов бэкенда.
 */
function setupSocketListeners() {
  if (!socket) return;

  // 🟡 ЖЕЛТЫЙ ЦВЕТ: События подключения и дисконнекта сокета
  socket.on('connect', () => {
    appendSystemMessage(`Система: Сетевое соединение установлено. Сокет ID: [${socket.id}]`, '#d1a100');
  });

  socket.on('disconnect', () => {
    appendSystemMessage('Система: Сетевое соединение разорвано сокетом', '#d1a100');
  });

  socket.on('connect_error', (err) => {
    appendSystemMessage(`Система: Ошибка подключения сокета: ${err.message}`, '#ff0000');
  });

  // 🔴 КРАСНЫЙ ЦВЕТ: Вывод критических ошибок из платформенного канала 'exception'
  socket.on('exception', (data) => {
    const errorText = data.message || data.text || "Критический сбой пайплайна";
    appendSystemMessage(`Критическая ошибка бэкенда: ${errorText}`, '#ff0000');
  });

  // Раскраска входящих/исходящих сообщений чата по статусам доставки от бэкенда
  socket.on('answerMessage', (data) => {
    let color = '#000000';
    let prefix = `[${data.from} ➔ ${data.to}]: `;

    if (data.status === 'send') {
      color = '#333333'; 
    } else if (data.status === 'error') {
      // ⚪ СЕРАЯ РАСКРАСКА: Адресата нет в сети сокетов
      color = '#888888'; 
      prefix = `[Оффлайн] ${prefix}`;
    } else if (data.status === 'ok') {
      color = '#008000'; // Зеленый для подтвержденной доставки
    }

    appendChatMessage(prefix + data.text, color);
  });
}

/**
 * Отправляет логическое событие сообщения на бэкенд.
 */
function sendMessage() {
  const emailInput = document.getElementById('target-email');
  const textInput = document.getElementById('message-text');
  
  if (!emailInput || !textInput) return;

  const email = emailInput.value.trim();
  const text = textInput.value.trim();
  
  if (socket && email && text) {
    socket.emit('askMessage', { email, text });
    textInput.value = ""; 
  }
}

/**
 * Реализует механизм Разлогирования (Clear Session)
 */
function logout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Принудительно затираем куку 'authorization' через выставление срока жизни в 0
  document.cookie = "authorization=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;";
  
  currentUsername = "";
  
  // Очищаем окно чата и инпуты
  const win = document.getElementById('chat-window');
  if (win) win.innerHTML = "";
  
  const usernameInput = document.getElementById('username-input');
  if (usernameInput) usernameInput.value = "";

  // Переключаем видимость блоков обратно на форму входа
  document.getElementById('auth-block').style.display = 'block';
  document.getElementById('chat-block').style.display = 'none';
}

function appendChatMessage(text, color) {
  const win = document.getElementById('chat-window');
  if (!win) return;
  
  win.innerHTML += `<div class="chat-msg" style="color: ${color};">${text}</div>`;
  win.scrollTop = win.scrollHeight;
}

function appendSystemMessage(text, color) {
  const win = document.getElementById('chat-window');
  if (!win) return;
  
  win.innerHTML += `<div class="system-msg" style="color: ${color}; border-left: 4px solid ${color};">⚠️ ${text}</div>`;
  win.scrollTop = win.scrollHeight;
}

// Привязываем методы к глобальному window скоупу для EJS
window.loginAndConnect = loginAndConnect;
window.sendMessage = sendMessage;
window.logout = logout;
