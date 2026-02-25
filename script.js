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
let postsBase = [];

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
  carregarPostsRealtime();
};

// ================= POSTAR =================
btnPost.onclick = async () => {
  const texto = document.getElementById("newPost").value.trim();
  if (!texto) return alert("Escreva algo");

  try {
    await db.collection("postagens").add({
      texto,
      nomeCanal: currentUser,
      data: firebase.firestore.FieldValue.serverTimestamp(),
      curtidas: {}
    });

    document.getElementById("newPost").value = "";

  } catch (err) {
    console.error(err);
    alert("Erro ao postar: " + err.message);
  }
};

// ================= LIKE =================
async function toggleLike(postId, texto) {
  console.log("clicou no like:", postId);

  const ref = db.collection("postagens").doc(postId);

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(ref);

      if (!doc.exists) throw "Post não existe";

      const data = doc.data();
      const likes = data.curtidas || {};

      if (likes[currentUser]) {
        delete likes[currentUser];
      } else {
        likes[currentUser] = true;
        aprenderTexto(texto);
      }

      t.update(ref, { curtidas: likes });
    });

    salvarDados();

  } catch (err) {
    console.error("ERRO LIKE:", err);
    alert("Erro ao curtir: " + err);
  }
}

// ================= ALGORITMO =================
function aprenderTexto(texto) {
  const palavras = texto.toLowerCase().split(/\W+/);

  palavras.forEach(p => {
    if (p.length < 4) return;
    likedKeywords[p] = (likedKeywords[p] || 0) + 1;
  });
}

function calcularScore(post) {
  let score = 0;

  const palavras = post.texto.toLowerCase().split(/\W+/);

  palavras.forEach(p => {
    if (likedKeywords[p]) {
      score += likedKeywords[p] * 5;
    }
  });

  const likes = post.curtidas ? Object.keys(post.curtidas).length : 0;
  score += likes * 2;

  if (post.data) {
    const horas = (Date.now() - post.data.toDate()) / (1000 * 60 * 60);
    score += Math.max(0, 20 - horas);
  }

  return score;
}

function misturarPosts(posts) {
  return posts.sort((a, b) => {
    const scoreA = calcularScore(a) + Math.random() * 10;
    const scoreB = calcularScore(b) + Math.random() * 10;
    return scoreB - scoreA;
  });
}

// ================= REALTIME =================
function carregarPostsRealtime() {
  db.collection("postagens").onSnapshot(snapshot => {

    postsBase = [];

    snapshot.forEach(doc => {
      postsBase.push({
        id: doc.id,
        ...doc.data()
      });
    });

    renderFeed();
  });
}

// ================= RENDER =================
function renderFeed() {
  feed.innerHTML = "";

  const postsOrdenados = misturarPosts([...postsBase]);

  postsOrdenados.forEach(post => {

    const likeCount = post.curtidas ? Object.keys(post.curtidas).length : 0;
    const liked = post.curtidas && post.curtidas[currentUser];
    const isYou = post.nomeCanal === currentUser;

    const div = document.createElement("div");
    div.className = "post";

    const btnText = liked ? "Curtido" : "Curtir";

    div.innerHTML = `
      ${isYou ? '<div class="you-tag">Você</div>' : ''}
      <strong>${post.nomeCanal}</strong>
      <p>${formatText(post.texto)}</p>
      <button class="like-btn">${btnText}</button>
      <span>${likeCount} curtidas</span>
    `;

    const btn = div.querySelector(".like-btn");

    btn.addEventListener("click", () => {
      toggleLike(post.id, post.texto);
    });

    feed.appendChild(div);
  });
}

// ================= DADOS =================
async function salvarDados() {
  await db.collection("dados").doc(currentUser).set({
    likedKeywords
  });
}

async function carregarDados() {
  const doc = await db.collection("dados").doc(currentUser).get();

  if (doc.exists) {
    likedKeywords = doc.data().likedKeywords || {};
  }
}