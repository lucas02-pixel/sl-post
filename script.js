// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBATZMxOgepqDJAd-J_X9BGq5kSrnXWSZA",
  authDomain: "sl-postagens.firebaseapp.com",
  projectId: "sl-postagens",
  storageBucket: "sl-postagens.firebasestorage.app",
  messagingSenderId: "336664673765",
  appId: "1:336664673765:web:a2bc241e70a7b291d3430c",
  measurementId: "G-W8XS75XQE0"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;

// Elementos
const userNameInput = document.getElementById("userName");
const btnEnter = document.getElementById("btnEnter");
const postForm = document.getElementById("postForm");
const btnPost = document.getElementById("btnPost");
const feed = document.getElementById("feed");
const userInputDiv = document.getElementById("userInput");

// Entrar
btnEnter.onclick = () => {
  const name = userNameInput.value.trim();
  if (!name) {
    alert("Digite seu nome para continuar.");
    return;
  }
  currentUser = name;
  userInputDiv.style.display = "none";
  postForm.style.display = "block";
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

// Adicionar comentário (em subcoleção)
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

// Carregar posts e seus comentários
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

        // Post container
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

// Carregar comentários para cada post
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