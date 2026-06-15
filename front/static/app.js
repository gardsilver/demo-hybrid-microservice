let socket;

const msgBox = document.getElementById('exampleFormControlTextarea1');
const msgCont = document.getElementById('data-container');
const email = document.getElementById('to-email');
const fromEmail = document.getElementById('from-email');
const connectStatus = document.getElementById('connect-icon') ?? 
                      document.getElementById('from-email')?.parentElement?.firstElementChild?.firstElementChild;
const messages = [];

fromEmail.focus();

fromEmail.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const nickname = e.target.value.trim();
    if (!nickname) return;

    e.target.disabled = true;
    setStatusColor("btn-outline-warning", "Подключение...");

    socket = io('http://127.0.0.1:3000', {
      transports: ['polling', 'websocket'],
      extraHeaders: {
        "send-from": nickname,
      }
    });

    socket.on("connect", () => {
      setStatusColor("btn-outline-success", "Успешно подключено к чату!");
      
      email.disabled = false;
      msgBox.disabled = false;
      
      email.focus();
    });

    socket.on('answerMessage', (message) => {
      if (message.status === 'error' && message.text === 'Unknown user') {
        setStatusColor("btn-outline-danger", "Ошибка: Неизвестный пользователь");
        
        fromEmail.disabled = false;
        fromEmail.focus();
        
        email.disabled = true;
        msgBox.disabled = true;
      }
      
      messages.push(message);
      loadDate(messages);
    });

    socket.on("connect_error", (error) => {
      setStatusColor("btn-outline-danger", "Ошибка подключения к серверу");
      console.error(error);
      fromEmail.disabled = false;
      fromEmail.focus();
    });

    socket.on("disconnect", (reason) => {
      setStatusColor("btn-outline-danger", `Содержимое разорвано: ${reason}`);
      email.disabled = true;
      msgBox.disabled = true;
      fromEmail.disabled = false;
    });
  }
});

email.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.target.value.trim()) {
      msgBox.focus();
    }
  }
});

msgBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const text = e.target.value.trim();
    const targetEmail = email.value.trim();
    
    if (!text || !targetEmail) return;

    sendMessage({ email: targetEmail, text: text });
    e.target.value = '';
  }
});

function setStatusColor(colorClass, logText) {
  if (connectStatus) {
    connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger");
    connectStatus.classList.add(colorClass);
  }
  console.log(`[Chat System]: ${logText}`);
}

function loadDate(data) {
  let messages = '';
  data.map((message) => {
    let text = '';
    if (message.from) {
      text += `<span class="fw-bolder">${message.from}</span>`;
    }
    if (message.to) {
      if (text !== '') text += ' to ';
      text += `<span class="fw-bolder">${message.to}</span>`;
    }
    text += text !== '' ? `: ${message.text}` : message.text;

    switch (message.status) {
      case "send":
        messages += `<li class="bg-success p-2 rounded mb-2 text-light">${text}</li>`;
        break;
      case "error":
        messages += `<li class="bg-danger p-2 rounded mb-2 text-light">${text}</li>`;
        break;
      default:
        messages += `<li class="bg-primary p-2 rounded mb-2 text-light">${text}</li>`;
        break;
    }
  });
  msgCont.innerHTML = messages;
}

function sendMessage(message) {
  socket?.emit('askMessage', message);
}
