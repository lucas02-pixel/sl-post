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
let lastDoc = null;
let loading = false;
let finished = false;

const POSTS_POR_CARGA = 10;

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

  feed.innerHTML = "";
  lastDoc = null;
  finished = false;

  carregarMaisPosts();

  window.addEventListener("scroll", verificarScroll);
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
  const ref = db.collection("postagens").doc(postId);

  await db.runTransaction(async (t) => {
    const doc = await t.get(ref);
    const data = doc.data();
    const likes = data.curtidas || {};

    if (likes[currentUser]) {
      delete likes[currentUser];
    } else {
      likes[currentUser] = true;

      // 🧠 aprende palavras
      aprenderTexto(texto);
    }

    t.update(ref, { curtidas: likes });
  });

  salvarDados();
}

// ================= ALGORITMO =================

// aprender palavras
function aprenderTexto(texto) {
  const palavras = texto.toLowerCase().split(/\W+/);

  palavras.forEach(p => {
    if (p.length < 4) return;

    likedKeywords[p] = (likedKeywords[p] || 0) + 1;
  });
}

// score inteligente
function calcularScore(post) {
  let score = 0;

  const palavras = post.texto.toLowerCase().split(/\W+/);

  // 1. palavras que você gosta
  palavras.forEach(p => {
    if (likedKeywords[p]) {
      score += likedKeywords[p] * 5;
    }
  });

  // 2. popularidade
  const likes = post.curtidas ? Object.keys(post.curtidas).length : 0;
  score += likes * 2;

  // 3. tempo (posts novos sobem)
  if (post.data) {
    const agora = Date.now();
    const tempoPost = post.data.toDate().getTime();
    const horas = (agora - tempoPost) / (1000 * 60 * 60);

    score += Math.max(0, 20 - horas); // perde relevância com o tempo
  }

  // 4. aleatoriedade (não ficar repetitivo)
  score += Math.random() * 5;

  return score;
}

// ================= CARREGAR POSTS =================
async function carregarMaisPosts() {
  if (loading || finished) return;
  loading = true;

  let query = db.collection("postagens")
    .orderBy("data", "desc")
    .limit(POSTS_POR_CARGA);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    finished = true;
    loading = false;
    return;
  }

  lastDoc = snapshot.docs[snapshot.docs.length - 1];

  let posts = [];

  snapshot.forEach(doc => {
    const data = doc.data();

    posts.push({
      id: doc.id,
      ...data,
      score: calcularScore(data)
    });
  });

  // 🔥 ordena pelo score
  posts.sort((a, b) => b.score - a.score);

  renderPosts(posts);

  loading = false;
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
function verificarScroll() {
  const scrollTop = window.scrollY;
  const altura = document.body.offsetHeight;
  const tela = window.innerHeight;

  if (scrollTop + tela >= altura - 200) {
    carregarMaisPosts();
  }
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
