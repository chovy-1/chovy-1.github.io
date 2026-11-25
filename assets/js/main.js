/* =============================================================
   站点脚本：导航、文章列表、Markdown 渲染
   ============================================================= */

(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (ch) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return map[ch];
    });

  const formatDate = (iso) => iso.replace(/-/g, ".");

  /* ---------- 简易 Markdown 渲染 ---------- */

  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function markdown(md) {
    // 去掉模板字符串带来的公共缩进，否则列表、引用无法识别
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const indents = lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^[ \t]*/)[0].length);
    const base = indents.length ? Math.min(...indents) : 0;
    const source = lines.map((line) => line.slice(base)).join("\n").trim();

    const codes = [];
    const text = escapeHTML(source).replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const cls = lang ? ` class="language-${lang}"` : "";
        codes.push(`<pre><code${cls}>${code.replace(/\n$/, "")}</code></pre>`);
        return `@@CODE${codes.length - 1}@@`;
      }
    );

    return text
      .split(/\n{2,}/)
      .map((block) => {
        const b = block.trim();
        if (!b) return "";

        const code = b.match(/^@@CODE(\d+)@@$/);
        if (code) return codes[Number(code[1])];
        if (b.startsWith("### ")) return `<h3>${inline(b.slice(4))}</h3>`;
        if (b.startsWith("## ")) return `<h2>${inline(b.slice(3))}</h2>`;
        if (b.startsWith("# ")) return `<h1>${inline(b.slice(2))}</h1>`;
        if (/^---+$/.test(b)) return "<hr>";

        // 文本已做 HTML 转义，引用符号此时是 &gt;
        if (b.startsWith("&gt;")) {
          return `<blockquote>${inline(
            b.replace(/^&gt;\s?/gm, "").replace(/\n/g, " ")
          )}</blockquote>`;
        }

        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return `<ol>${lines
            .map((l) => `<li>${inline(l.replace(/^\d+\. /, ""))}</li>`)
            .join("")}</ol>`;
        }

        return `<p>${inline(b).replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");
  }

  /* ---------- 导航 ---------- */

  function initNav() {
    $$("[data-site-name]").forEach((el) => {
      el.textContent = SITE.name;
    });

    $$("[data-site-email]").forEach((el) => {
      el.textContent = SITE.email;
      el.setAttribute("href", `mailto:${SITE.email}`);
    });

    $$("[data-site-github]").forEach((el) => {
      el.setAttribute("href", SITE.github);
      el.textContent = "GitHub";
    });

    $$("[data-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    const page = document.body.dataset.page;
    if (page) {
      $$(".nav a").forEach((a) => {
        if (a.dataset.nav === page) a.setAttribute("aria-current", "page");
      });
    }

    const toggle = $(".nav-toggle");
    const nav = $(".nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }
  }

  /* ---------- 首页文章列表 ---------- */

  function initHome() {
    const mount = $("[data-post-list]");
    if (!mount) return;

    const list = POSTS.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

    if (!list.length) {
      mount.innerHTML = `<p class="muted">还没有文章。</p>`;
      return;
    }

    mount.innerHTML = `<ul class="post-list">${list
      .map(
        (post) => `
          <li>
            <time>${formatDate(post.date)}</time>
            <a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHTML(
          post.title
        )}</a>
          </li>`
      )
      .join("")}</ul>`;
  }

  /* ---------- 文章详情 ---------- */

  function initPost() {
    const root = $("[data-post]");
    if (!root) return;

    const slug = new URLSearchParams(location.search).get("slug");
    const post = POSTS.find((p) => p.slug === slug);

    const titleEl = $("[data-post-title]", root);
    const dateEl = $("[data-post-date]", root);
    const bodyEl = $("[data-post-body]", root);

    if (!post) {
      document.title = `没有找到这篇 · ${SITE.name}`;
      titleEl.textContent = "没有找到这篇文章";
      dateEl.textContent = "";
      bodyEl.innerHTML = `<p class="muted"><a href="index.html">返回首页</a></p>`;
      return;
    }

    document.title = `${post.title} · ${SITE.name}`;
    titleEl.textContent = post.title;
    dateEl.textContent = formatDate(post.date);
    bodyEl.innerHTML = markdown(post.content);
  }

  /* ---------- 启动 ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initHome();
    initPost();
  });
})();
