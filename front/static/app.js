let socket;

const msgBox = document.getElementById('exampleFormControlTextarea1');
const msgCont = document.getElementById('data-container');
const email = document.getElementById('to-email');
const fromEmail = document.getElementById('from-email');
const connectStatus = document.getElementById('from-email').parentElement.firstElementChild.firstElementChild;
const messages = [];

fromEmail.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    e.target.disabled = true;

    socket = io('', {
      extraHeaders: {
        "send-from": e.target.value,
      }
    });

    socket.io.on("error", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-danger")
    })

    socket.io.on("reconnect", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-warning")
    })

    socket.io.on("reconnect_error", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-danger")
    })

    socket.io.on("reconnect_failed", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-danger")
    })

    socket.on("connect", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-success")
    })

     socket.on("disconnect", () => {
      connectStatus.classList.remove("btn-outline-default", "btn-outline-warning", "btn-outline-success", "btn-outline-danger")
      connectStatus.classList.add("btn-outline-danger")
    })

    socket.on('answerMessage', (message) => {
      messages.push(message);
      loadDate(messages);
    });

    email.focus();
  }
});

email.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    msgCont.focus();
  }
});

msgBox.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    sendMessage({ email: email.value, text: e.target.value });
    e.target.value = '';
  }
});

function loadDate(data) {
  let messages = '';
  data.map((message) => {
    switch (message.status) {
      case "send":
        messages += 
        `<li class="bg-success p-2 rounded mb-2 text-light">
          <span class="fw-bolder">${message.from}</span> to <span class="fw-bolder">${message.to}</span>: ${message.text}
        </li>`
        break;
      case "error":
        messages += 
        ` <li class="bg-danger p-2 rounded mb-2 text-light">
          <span class="fw-bolder">${message.from}</span> to <span class="fw-bolder">${message.to}</span>: ${message.text}
        </li>`;
        break;
      default:
        messages += ` <li class="bg-primary  p-2 rounded mb-2 text-light">
          <span class="fw-bolder">${message.from}</span> to <span class="fw-bolder">${message.to}</span>: ${message.text}
        </li>`;
        break;
    }
  });
  msgCont.innerHTML = messages;
}

function sendMessage(message) {
  socket?.emit('askMessage', message);
}

