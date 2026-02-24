// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyBATZMxOgepqDJAd-J_X9BGq5kSrnXWSZA",
  authDomain: "sl-postagens.firebaseapp.com",
  projectId: "sl-postagens",
  storageBucket: "sl-postagens.firebasestorage.app",
  messagingSenderId: "336664673765",
  appId: "1:336664673765:web:a2bc241e70a7b291d3430c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= VARIÁVEIS =================
let currentUser = null;
let likedKeywords = {}; // algoritmo

const userNameInput = document.getElementById("userName");
const btnEnter = document.getElementById("btnEnter");
const postForm = document.getElementById("postForm");
const btnPost = document.getElementById("btnPost");
const feed = document.getElementById("feed");

// ================= LINKS CLICÁVEIS =================
function formatText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url =>
    `<a href="${url}" target="_blank">${url}</a>`
  );
}

// ================= NOTIFICAÇÃO =================
async function notificarBoasVindas(nome) {
  if (!("Notification" in window)) return;

  let perm = Notification.permission;
  if (perm !== "granted") {
    perm = await Notification.requestPermission();
  }

  if (perm === "granted") {
    new Notification("👋 Bem-vindo!", {
      body: `Olá ${nome}!`,
    });
  }
}

// ================= ENTRAR =================
btnEnter.onclick = async () => {
  const name = userNameInput.value.trim();
  if (!name) return alert("Digite seu nome");

  currentUser = name;

  document.getElementById("userInput").style.display = "none";
  postForm.style.display = "block";

  await carregarDados();
  loadPosts();
  notificarBoasVindas(name);
};

// ================= POSTAR =================
btnPost.onclick = async () => {
  const texto = document.getElementById("newPost").value.trim();
  if (!texto) return alert("Escreva algo");

  await db.collection("postagens").add({
    texto,
    nomeCanal: currentUser,
    data: firebase.firestore.FieldValue.serverTimestamp(),
    curtidas: {}
  });

  document.getElementById("newPost").value = "";
};

// ================= LIKE =================
async function toggleLike(postId, texto) {
  const postRef = db.collection("postagens").doc(postId);

  await db.runTransaction(async (t) => {
    const doc = await t.get(postRef);
    const data = doc.data();
    const likes = data.curtidas || {};

    if (likes[currentUser]) {
      delete likes[currentUser];
    } else {
      likes[currentUser] = true;

      // 🧠 aprende palavras
      aprenderTexto(texto);
    }

    t.update(postRef, { curtidas: likes });
  });

  salvarDados();
}

// ================= ALGORITMO =================

// aprende palavras do texto
function aprenderTexto(texto) {
  const palavras = texto.toLowerCase().split(" ");

  palavras.forEach(p => {
    if (p.length < 4) return;

    likedKeywords[p] = (likedKeywords[p] || 0) + 1;
  });
}

// pontuação de recomendação
function calcularScore(texto) {
  const palavras = texto.toLowerCase().split(" ");
  let score = 0;

  palavras.forEach(p => {
    if (likedKeywords[p]) {
      score += likedKeywords[p];
    }
  });

  return score;
}

// ================= CARREGAR POSTS =================
function loadPosts() {
  db.collection("postagens")
    .orderBy("data", "desc")
    .onSnapshot(snapshot => {

      let posts = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          score: calcularScore(data.texto)
        });
      });

      // 🔥 ordenar pelo algoritmo
      posts.sort((a, b) => b.score - a.score);

      feed.innerHTML = "";

      posts.forEach(post => {
        const likeCount = post.curtidas ? Object.keys(post.curtidas).length : 0;
        const liked = post.curtidas && post.curtidas[currentUser];

        const isYou = post.nomeCanal === currentUser;

        const div = document.createElement("div");
        div.className = "post";

        div.innerHTML = `
          ${isYou ? '<div class="you-tag">Você</div>' : ''}
          <strong>${post.nomeCanal}</strong>
          <p>${formatText(post.texto)}</p>

          <button onclick="toggleLike('${post.id}', \`${post.texto}\`)">
            ${liked ? 'Curtido' : 'Curtir'}
          </button>

          <span>${likeCount} curtidas</span>
        `;

        feed.appendChild(div);
      });
    });
}

// ================= SALVAR DADOS =================
async function salvarDados() {
  await db.collection("dados").doc(currentUser).set({
    likedKeywords
  });
}

// ================= CARREGAR DADOS =================
async function carregarDados() {
  const doc = await db.collection("dados").doc(currentUser).get();

  if (doc.exists) {
    likedKeywords = doc.data().likedKeywords || {};
  }
}
