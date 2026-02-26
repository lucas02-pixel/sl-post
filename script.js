// ===== CONFIG =====
const postsContainer = document.getElementById("posts");
const btnPost = document.getElementById("btnPost");
const inputPost = document.getElementById("inputPost");

let usuario = localStorage.getItem("usuario") || "user_" + Math.floor(Math.random()*1000);
localStorage.setItem("usuario", usuario);

// ===== BASE =====
let posts = JSON.parse(localStorage.getItem("posts") || "[]");
let curtidas = JSON.parse(localStorage.getItem("curtidas") || "{}");

// ===== CRIAR POST =====
btnPost.onclick = () => {
  const texto = inputPost.value.trim();
  if (!texto) return;

  const novoPost = {
    id: Date.now(),
    usuario: usuario,
    texto: texto,
    likes: 0,
    data: Date.now()
  };

  posts.unshift(novoPost);
  salvar();
  inputPost.value = "";
  gerarFeed();
};

// ===== SALVAR =====
function salvar() {
  localStorage.setItem("posts", JSON.stringify(posts));
  localStorage.setItem("curtidas", JSON.stringify(curtidas));
}

// ===== ALGORITMO =====
function calcularScore(post) {
  if (!post || !post.texto) return 0;

  let score = 0;

  // popularidade
  score += (post.likes || 0) * 3;

  // recência
  const tempo = (Date.now() - post.data) / 1000;
  score += Math.max(0, 10000 - tempo);

  // interesse simples
  const texto = post.texto.toLowerCase();

  if (texto.includes("jogo")) score += 200;
  if (texto.includes("legal")) score += 100;

  // se já curtiu
  if (curtidas[post.id]) score += 500;

  return score;
}

// ===== MISTURAR POSTS =====
function misturarPosts(lista) {
  return lista
    .map(p => ({
      post: p,
      score: calcularScore(p) + Math.random() * 500
    }))
    .sort((a, b) => b.score - a.score)
    .map(p => p.post);
}

// ===== GERAR FEED INFINITO =====
function gerarFeed() {
  postsContainer.innerHTML = "";

  if (posts.length === 0) {
    postsContainer.innerHTML = "<p>Nenhum post ainda...</p>";
    return;
  }

  // cria feed "infinito" repetindo posts
  let feed = [];

  for (let i = 0; i < 5; i++) {
    feed = feed.concat(posts);
  }

  feed = misturarPosts(feed);

  feed.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";

    const jaCurtiu = curtidas[post.id];

    div.innerHTML = `
      <b>@${post.usuario}</b>
      <p>${formatarTexto(post.texto)}</p>
      <button onclick="curtir(${post.id})">
        ${jaCurtiu ? "💖 Curtido" : "🤍 Curtir"} (${post.likes})
      </button>
    `;

    postsContainer.appendChild(div);
  });
}

// ===== CURTIR =====
function curtir(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  if (curtidas[id]) {
    // descurtir
    post.likes--;
    delete curtidas[id];
  } else {
    post.likes++;
    curtidas[id] = true;
  }

  salvar();
  gerarFeed();
}

// ===== LINK CLICAVEL =====
function formatarTexto(texto) {
  if (!texto) return "";

  return texto.replace(
    /(https?:\/\/[^\s]+)/g,
    url => `<a href="${url}" target="_blank">${url}</a>`
  );
}

// ===== INICIAR =====
gerarFeed();