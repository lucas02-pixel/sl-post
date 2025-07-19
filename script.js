// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBATZMxOgepqDJAd-J_X9BGq5kSrnXWSZA",
  authDomain: "sl-postagens.firebaseapp.com",
  projectId: "sl-postagens",
  storageBucket: "sl-postagens.firebasestorage.app",
  messagingSenderId: "336664673765",
  appId: "1:336664673765:web:a2bc241e70a7b291d3430c"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();

let currentUser = null;

// Elementos
const userNameInput = document.getElementById("userName");
const btnEnter = document.getElementById("btnEnter");
const postForm = document.getElementById("postForm");
const btnPost = document.getElementById("btnPost");
const feed = document.getElementById("feed");

// Entrar
btnEnter.onclick = () => {
  const name = userNameInput.value.trim();
  if (!name) {
    alert("Digite seu nome para continuar.");
    return;
  }
  currentUser = name;
  document.getElementById("userInput").style.display = "none";
  document.getElementById("postForm").style.display = "block";
  loadPosts();
};

// Publicar post
btnPost.onclick = () => {
  const texto = document.getElementById("newPost").value.trim();
  if (!texto) return alert("Escreva algo para postar.");

  db.collection("postagens").add({
    texto,
    nomeCanal: currentUser,
    data: firebase.firestore.FieldValue.serverTimestamp(),
    curtidas: {}
  }).then(() => {
    document.getElementById("newPost").value = "";
  }).catch(err => alert("Erro ao publicar: " + err.message));
};

// Curtir / descurtir post
function toggleLike(postId) {
  const postRef = db.collection("postagens").doc(postId);
  db.runTransaction(async (transaction) => {
    const doc = await transaction.get(postRef);
    if (!doc.exists) throw "Post não encontrado.";

    const data = doc.data();
    const likes = data.curtidas || {};

    if (likes[currentUser]) {
      delete likes[currentUser];
    } else {
      likes[currentUser] = true;
    }

    transaction.update(postRef, { curtidas: likes });
  }).catch(err => alert("Erro ao curtir: " + err));
}

// Mostrar/ocultar comentários
function toggleComments(postId) {
  const commentsDiv = document.getElementById(`comments-${postId}`);
  if (!commentsDiv) return;
  commentsDiv.style.display = commentsDiv.style.display === "none" ? "block" : "none";
}

// Adicionar comentário
function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const texto = input.value.trim();
  if (!texto) return alert("Escreva um comentário.");

  const comentariosRef = db.collection("postagens").doc(postId).collection("comentarios");

  comentariosRef.add({
    nomeCanal: currentUser,
    texto,
    data: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    input.value = "";
  }).catch(err => alert("Erro ao comentar: " + err.message));
}

// Carregar posts
function loadPosts() {
  db.collection("postagens")
    .orderBy("data", "desc")
    .onSnapshot(snapshot => {
      feed.innerHTML = "";
      if (snapshot.empty) {
        feed.innerHTML = "<p>Nenhuma postagem encontrada.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const post = doc.data();
        const postId = doc.id;
        const likeCount = post.curtidas ? Object.keys(post.curtidas).length : 0;
        const liked = post.curtidas && post.curtidas[currentUser];

        const div = document.createElement("div");
        div.className = "post";

        div.innerHTML = `
          <div><strong>${post.nomeCanal}</strong></div>
          <p>${post.texto}</p>
          <button class="like-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${postId}')">
            ${liked ? 'Curtido' : 'Curtir'}
          </button>
          <span>${likeCount} curtida${likeCount !== 1 ? 's' : ''}</span>
          <button class="secondary-btn" onclick="toggleComments('${postId}')">Ver Comentários</button>
          <div id="comments-${postId}" class="comments" style="display:none; margin-top:10px;">
            <div id="comments-list-${postId}">Carregando comentários...</div>
            <input type="text" id="comment-input-${postId}" placeholder="Escreva um comentário..." />
            <button onclick="addComment('${postId}')">Comentar</button>
          </div>
        `;

        feed.appendChild(div);

        loadComments(postId);
      });
    }, err => {
      alert("Erro ao carregar postagens: " + err.message);
    });
}

// Carregar comentários
function loadComments(postId) {
  const commentsListDiv = document.getElementById(`comments-list-${postId}`);
  const comentariosRef = db.collection("postagens").doc(postId).collection("comentarios").orderBy("data", "asc");

  comentariosRef.onSnapshot(snapshot => {
    if (snapshot.empty) {
      commentsListDiv.innerHTML = "<p>Sem comentários</p>";
      return;
    }

    const commentsHTML = [];
    snapshot.forEach(doc => {
      const c = doc.data();
      commentsHTML.push(`
        <div class="comment">
          <strong>${c.nomeCanal}</strong>: ${c.texto}
        </div>
      `);
    });

    commentsListDiv.innerHTML = commentsHTML.join("");
  }, err => {
    commentsListDiv.innerHTML = "<p>Erro ao carregar comentários</p>";
    console.error(err);
  });
}

// ==== NOTIFICAÇÕES FIREBASE MESSAGING ====

// Registra o Service Worker
navigator.serviceWorker.register('/sl-post/firebase-messaging-sw.js')
  .then(registration => {
    console.log('Service Worker registrado com sucesso:', registration);
    messaging.useServiceWorker(registration);

    // Pede permissão de notificações
    return Notification.requestPermission();
  })
  .then(permission => {
    if (permission !== 'granted') {
      throw new Error('Permissão de notificações negada');
    }
    console.log('Permissão para notificações concedida');

    // Pega token para enviar notificações para este navegador
    return messaging.getToken({ vapidKey: 'BCHIi6jYJGzVhPQnKwUzDy8gDfHcFQlT9sWzVJpKuV7C9rL8E0NkK7BkRMA' });
  })
  .then(token => {
    console.log('Token FCM obtido:', token);
    // Aqui você pode enviar o token para seu backend salvar e usar para enviar notificações
  })
  .catch(err => {
    console.error('Erro ao configurar notificações:', err);
  });

// Escuta notificações quando o site está aberto (foreground)
messaging.onMessage(payload => {
  console.log('Notificação recebida no primeiro plano:', payload);
  const { title, body } = payload.notification || {};
  if (Notification.permission === 'granted') {
    new Notification(title || 'Notificação', {
      body
    });
  }
});

