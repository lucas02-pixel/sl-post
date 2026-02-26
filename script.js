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
let likedKeywords = {};
let postsBase = []; // todos os posts

// elementos
const userNameInput = document.getElementById("userName");
const btnEnter = document.getElementById("btnEnter");
const postForm = document.getElementById("postForm");
const btnPost = document.getElementById("btnPost");
const feed = document.getElementById("feed");

// ================= LINKS =================
function formatText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url =>
    `<a href="${url}" target="_blank">${url}</a>`
  );
}

// ================= ENTRAR =================
btnEnter.onclick = async () => {
  const name = userNameInput.value.trim();
  if (!name) return alert("Digite seu nome");

  currentUser = name;

  document.getElementById("userInput").style.display = "none";
  postForm.style.display = "block";

  await carregarDados();
  await carregarPosts();

  gerarFeed(); // 🔥 gera feed infinito

  window.addEventListener("scroll", scrollFeed);
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

  await carregarPosts();
  feed.innerHTML = "";
  gerarFeed();
};

// ================= LIKE =================
async function toggleLike(postId, texto) {
  const ref = db.collection("postagens").doc(postId);

  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    const likes = data.curtidas || {};

    if (likes[currentUser]) {
      delete likes[currentUser];
    } else {
      likes[currentUser] = true;

      aprenderTexto(texto); // 🧠 aprende
    }

    t.update(ref, { curtidas: likes });
  });

  salvarDados();
}

// ================= ALGORITMO =================

// aprende palavras
function aprenderTexto(texto) {
  const palavras = texto.toLowerCase().split(/\W+/);

  palavras.forEach(p => {
    if (p.length < 4) return;
    likedKeywords[p] = (likedKeywords[p] || 0) + 1;
  });
}

// score
function calcularScore(post) {
  let score = 0;

  const palavras = post.texto.toLowerCase().split(/\W+/);

  // interesse do usuário
  palavras.forEach(p => {
    if (likedKeywords[p]) {
      score += likedKeywords[p] * 5;
    }
  });

  // popularidade
  const likes = post.curtidas ? Object.keys(post.curtidas).length : 0;
  score += likes * 2;

  // tempo
  if (post.data) {
    const horas = (Date.now() - post.data.toDate()) / (1000 * 60 * 60);
    score += Math.max(0, 20 - horas);
  }

  return score;
}

// mistura inteligente
function misturarPosts(posts) {
  return posts.sort((a, b) => {
    const scoreA = calcularScore(a) + Math.random() * 10;
    const scoreB = calcularScore(b) + Math.random() * 10;

    return scoreB - scoreA;
  });
}

// ================= CARREGAR POSTS =================
async function carregarPosts() {
  const snapshot = await db.collection("postagens").get();

  postsBase = [];

  snapshot.forEach(doc => {
    postsBase.push({
      id: doc.id,
      ...doc.data()
    });
  });
}

// ================= GERAR FEED =================
function gerarFeed() {
  const misturados = misturarPosts([...postsBase]);

  renderPosts(misturados);
}

// ================= RENDER =================
function renderPosts(posts) {
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
}

// ================= SCROLL INFINITO =================
function scrollFeed() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
    // 🔥 adiciona mais posts misturados (loop infinito)
    gerarFeed();
  }
}

// ================= SALVAR =================
async function salvarDados() {
  await db.collection("dados").doc(currentUser).set({
    likedKeywords
  });
}

// ================= CARREGAR =================
async function carregarDados() {
  const doc = await db.collection("dados").doc(currentUser).get();

  if (doc.exists) {
    likedKeywords = doc.data().likedKeywords || {};
  }
}