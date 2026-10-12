const DEFAULTS = {
  owner: "joelagbo",
  repo: "cryptocurrencyscripts_website_rebuild",
  branch: "main",
  postsPath: "src/data/posts.json",
};

const reserved = new Set(["blog", "contact-us", "about-us", "contact", "category", "tag", "search", "admin", "cms", "sitemap"]);

const $ = (id) => document.getElementById(id);

const state = {
  token: sessionStorage.getItem("cms_token") || "",
  posts: [],
  postsSha: "",
  categories: [],
  editingSlug: null,
  quill: null,
};

function settings() {
  return {
    owner: localStorage.getItem("cms_owner") || DEFAULTS.owner,
    repo: localStorage.getItem("cms_repo") || DEFAULTS.repo,
    branch: localStorage.getItem("cms_branch") || DEFAULTS.branch,
  };
}

function setStatus(msg, kind = "ok") {
  const el = $("cms-status");
  if (!msg) {
    el.className = "cms-status cms-hidden";
    el.textContent = "";
    return;
  }
  el.className = `cms-status ${kind}`;
  el.textContent = msg;
}

function encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function decode(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\n/g, ""))));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function strip(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[^;]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function readingTime(html) {
  const words = strip(html).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

async function gh(path, options = {}) {
  const { owner, repo } = settings();
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data.message || `${res.status} ${path}`);
  return data;
}

async function getFile(path) {
  const { branch } = settings();
  return gh(`contents/${path}?ref=${encodeURIComponent(branch)}`);
}

async function putFile(path, contentB64, message, sha) {
  const { branch } = settings();
  const body = { message, content: contentB64, branch };
  if (sha) body.sha = sha;
  return gh(`contents/${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function show(view) {
  $("view-login").classList.toggle("cms-hidden", view !== "login");
  $("view-list").classList.toggle("cms-hidden", view !== "list");
  $("view-editor").classList.toggle("cms-hidden", view !== "editor");
}

function renderList(filter = "") {
  const q = filter.trim().toLowerCase();
  const rows = state.posts
    .filter((p) => !q || `${p.title} ${p.slug} ${p.excerptText}`.toLowerCase().includes(q))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  $("post-count").textContent = `${rows.length} post${rows.length === 1 ? "" : "s"}`;
  $("post-rows").innerHTML = rows
    .map((p) => {
      const cats = (p.categories || [])
        .map((id) => state.categories.find((c) => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      return `<tr>
        <td><strong>${strip(p.title)}</strong><div class="cms-help">/${p.slug}/</div></td>
        <td>${cats || "—"}</td>
        <td>${(p.date || "").slice(0, 10)}</td>
        <td class="cms-actions">
          <button class="cms-btn secondary" data-edit="${p.slug}">Edit</button>
          <button class="cms-btn danger" data-del="${p.slug}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

function ensureQuill() {
  if (state.quill) return state.quill;
  state.quill = new Quill("#editor", {
    theme: "snow",
    placeholder: "Write the article…",
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline", "link"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "image"],
          ["clean"],
        ],
        handlers: {
          image: () => $("inline-image").click(),
        },
      },
    },
  });
  return state.quill;
}

function fillCategories(selected = []) {
  $("categories").innerHTML = state.categories
    .map(
      (c) => `<label><input type="checkbox" value="${c.id}" ${selected.includes(c.id) ? "checked" : ""}/> ${c.name}</label>`
    )
    .join("");
}

function selectedCategories() {
  return [...$("categories").querySelectorAll("input:checked")].map((el) => Number(el.value));
}

function openEditor(post) {
  ensureQuill();
  state.editingSlug = post ? post.slug : null;
  $("editor-title").textContent = post ? "Edit post" : "New post";
  $("title").value = post ? strip(post.title) : "";
  $("slug").value = post ? post.slug : "";
  $("date").value = post ? post.date.slice(0, 16) : new Date().toISOString().slice(0, 16);
  $("excerpt").value = post ? post.excerptText || strip(post.excerpt) : "";
  $("seoTitle").value = post ? post.seoTitle || "" : "";
  $("seoDescription").value = post ? post.seoDescription || "" : "";
  $("featuredImage").value = post ? post.featuredImage || "" : "";
  fillCategories(post ? post.categories || [] : []);
  state.quill.root.innerHTML = post ? post.content || "" : "";
  show("editor");
  setStatus("");
}

function collectPost(existing) {
  const title = $("title").value.trim();
  let slug = slugify($("slug").value.trim() || title);
  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");
  if (reserved.has(slug)) throw new Error(`“${slug}” is a reserved URL.`);
  const clash = state.posts.find((p) => p.slug === slug && p.slug !== state.editingSlug);
  if (clash) throw new Error("That slug is already used.");
  const content = state.quill.root.innerHTML;
  const excerptText = $("excerpt").value.trim() || strip(content).slice(0, 220);
  const dateValue = $("date").value;
  const date = dateValue ? new Date(dateValue).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19);
  return {
    id: existing?.id || Math.max(0, ...state.posts.map((p) => p.id || 0)) + 1,
    slug,
    date,
    modified: new Date().toISOString().slice(0, 19),
    title,
    excerpt: `<p>${excerptText}</p>\n`,
    excerptText,
    content,
    categories: selectedCategories(),
    tags: existing?.tags || [],
    featuredImage: $("featuredImage").value.trim(),
    seoTitle: $("seoTitle").value.trim() || `${title} - CryptocurrencyScripts`,
    seoDescription: $("seoDescription").value.trim() || excerptText,
    readingTime: readingTime(content),
  };
}

async function savePosts(message) {
  const json = `${JSON.stringify(state.posts, null, 2)}\n`;
  const result = await putFile(DEFAULTS.postsPath, encode(json), message, state.postsSha);
  state.postsSha = result.content.sha;
}

async function loadFromGitHub() {
  setStatus("Loading posts from GitHub…");
  const postsFile = await getFile(DEFAULTS.postsPath);
  state.postsSha = postsFile.sha;
  state.posts = JSON.parse(decode(postsFile.content));
  try {
    const catsFile = await getFile("src/data/categories.json");
    state.categories = JSON.parse(decode(catsFile.content));
  } catch {
    state.categories = [];
  }
  renderList($("search").value);
  show("list");
  setStatus("Loaded. Saves commit to GitHub and trigger a Pages rebuild.");
}

async function uploadPath(file, destPath) {
  const b64 = await fileToBase64(file);
  let sha;
  try {
    const existing = await getFile(destPath);
    sha = existing.sha;
  } catch {
    sha = undefined;
  }
  await putFile(destPath, b64, `Upload ${file.name}`, sha);
  return `/${destPath.replace(/^public\//, "")}`;
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.token = $("token").value.trim();
  if (!state.token) return;
  localStorage.setItem("cms_owner", $("owner").value.trim() || DEFAULTS.owner);
  localStorage.setItem("cms_repo", $("repo").value.trim() || DEFAULTS.repo);
  localStorage.setItem("cms_branch", $("branch").value.trim() || DEFAULTS.branch);
  sessionStorage.setItem("cms_token", state.token);
  try {
    await loadFromGitHub();
  } catch (err) {
    setStatus(err.message, "err");
    show("login");
  }
});

$("logout").addEventListener("click", () => {
  sessionStorage.removeItem("cms_token");
  state.token = "";
  show("login");
  setStatus("");
});

$("new-post").addEventListener("click", () => openEditor(null));
$("cancel-edit").addEventListener("click", () => {
  show("list");
  setStatus("");
});
$("search").addEventListener("input", () => renderList($("search").value));

$("title").addEventListener("input", () => {
  if (!state.editingSlug && !$("slug").dataset.touched) $("slug").value = slugify($("title").value);
});
$("slug").addEventListener("input", () => {
  $("slug").dataset.touched = "1";
});

$("post-rows").addEventListener("click", async (event) => {
  const edit = event.target.dataset.edit;
  const del = event.target.dataset.del;
  if (edit) {
    const post = state.posts.find((p) => p.slug === edit);
    if (post) openEditor(post);
  }
  if (del) {
    const post = state.posts.find((p) => p.slug === del);
    if (!post) return;
    if (!confirm(`Delete “${strip(post.title)}”? This commits to GitHub.`)) return;
    try {
      setStatus("Deleting…");
      state.posts = state.posts.filter((p) => p.slug !== del);
      await savePosts(`Delete post: ${post.slug}`);
      renderList($("search").value);
      setStatus("Deleted. Cloudflare Pages will rebuild shortly.");
    } catch (err) {
      setStatus(err.message, "err");
    }
  }
});

$("save-post").addEventListener("click", async () => {
  try {
    const existing = state.editingSlug ? state.posts.find((p) => p.slug === state.editingSlug) : null;
    const next = collectPost(existing);
    if (state.editingSlug) {
      state.posts = state.posts.map((p) => (p.slug === state.editingSlug ? next : p));
    } else {
      state.posts.unshift(next);
    }
    setStatus("Saving to GitHub…");
    await savePosts(`${existing ? "Update" : "Add"} post: ${next.slug}`);
    state.editingSlug = next.slug;
    renderList($("search").value);
    show("list");
    setStatus("Saved. Cloudflare Pages will rebuild in about 1–2 minutes.");
  } catch (err) {
    setStatus(err.message, "err");
  }
});

$("featured-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setStatus("Uploading image…");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const safe = file.name.replace(/[^\w.\-]+/g, "-").toLowerCase();
    const url = await uploadPath(file, `public/uploads/${now.getFullYear()}/${month}/${safe}`);
    $("featuredImage").value = url;
    setStatus(`Image uploaded: ${url}`);
  } catch (err) {
    setStatus(err.message, "err");
  }
  event.target.value = "";
});

$("inline-image").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setStatus("Uploading image…");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const safe = file.name.replace(/[^\w.\-]+/g, "-").toLowerCase();
    const url = await uploadPath(file, `public/uploads/${now.getFullYear()}/${month}/${safe}`);
    const range = state.quill.getSelection(true);
    state.quill.insertEmbed(range.index, "image", url);
    setStatus(`Image inserted: ${url}`);
  } catch (err) {
    setStatus(err.message, "err");
  }
  event.target.value = "";
});

$("owner").value = settings().owner;
$("repo").value = settings().repo;
$("branch").value = settings().branch;

if (state.token) {
  $("token").value = state.token;
  loadFromGitHub().catch((err) => {
    setStatus(err.message, "err");
    show("login");
  });
} else {
  show("login");
}
