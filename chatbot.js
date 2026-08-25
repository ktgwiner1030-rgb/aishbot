/**
 * chatbot.js — FAQ 사이드 챗봇 (플로팅 버튼 + 키워드 검색)
 * data/faq.json 기반. 런타임 AI API 호출 없음.
 */
(function () {
  "use strict";

  const btnToggle = document.getElementById("chatbot-toggle");
  const btnClose  = document.getElementById("chatbot-close");
  const panel     = document.getElementById("chatbot-panel");
  const backdrop  = document.getElementById("chatbot-backdrop");
  const messages  = document.getElementById("chatbot-messages");
  const input     = document.getElementById("chatbot-input");
  const btnSend   = document.getElementById("chatbot-send");

  let faqData = [];
  let isOpen  = false;

  const SCORE_GOOD  = 4;
  const SCORE_WEAK  = 1;
  const MAX_RESULTS = 3;

  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    backdrop.classList.add("active");
    btnToggle.classList.add("hidden");
    input.focus();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    backdrop.classList.remove("active");
    btnToggle.classList.remove("hidden");
  }

  if (btnToggle) btnToggle.addEventListener("click", openPanel);
  if (btnClose)  btnClose.addEventListener("click", closePanel);
  if (backdrop)  backdrop.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  function addMessage(role, html) {
    const div = document.createElement("div");
    div.className = "msg msg--" + role;
    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addUserMessage(text) {
    addMessage("user", escHtml(text));
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tokenize(text) {
    const tokens = text.match(/[가-힣a-zA-Z0-9/]{2,}|[/]/g) || [];
    const stopwords = new Set(["있나요", "있을", "있는", "무엇", "어떻게", "인가요", "하나요", "되나요", "인지", "이란"]);
    return tokens.filter(function (t) { return !stopwords.has(t); });
  }

  function searchFAQ(query) {
    const trimmed = query.trim().toLowerCase();

    const exactMatch = faqData.find(function (item) {
      return item.q.trim().toLowerCase() === trimmed;
    });
    if (exactMatch) {
      return [{ item: exactMatch, score: SCORE_GOOD }];
    }

    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const scored = faqData.map(function (item) {
      let score = 0;
      tokens.forEach(function (token) {
        const t = token.toLowerCase();
        if (item.q.toLowerCase().includes(t)) score += 3;
        if (item.tags && item.tags.some(function (tag) {
          return tag.toLowerCase().includes(t);
        })) score += 2;
        if (item.a.toLowerCase().includes(t)) score += 1;
      });
      return { item: item, score: score };
    });

    return scored
      .filter(function (r) { return r.score >= SCORE_WEAK; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, MAX_RESULTS);
  }

  function renderAnswer(results) {
    if (results.length === 0) {
      addMessage("bot", `
        <p>죄송합니다. 관련 항목을 찾지 못했어요.</p>
        <p>다른 키워드로 다시 질문하거나, 아래 예시 버튼을 눌러보세요.</p>
      `);
      appendSuggestedButtons();
      return;
    }

    const best = results[0];

    if (best.score >= SCORE_GOOD) {
      addMessage("bot", `
        <p><strong>Q. ${escHtml(best.item.q)}</strong></p>
        <div class="answer-card">${escHtml(best.item.a)}</div>
      `);
      if (results.length > 1) {
        appendRelatedButtons(results.slice(1));
      }
    } else {
      addMessage("bot", `
        <p>정확한 답변을 찾기 어려웠어요. 아래 관련 항목 중 하나를 선택해 보세요.</p>
      `);
      appendRelatedButtons(results);
    }
  }

  function appendRelatedButtons(results) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg msg--bot";

    let html = "<p>관련 항목:</p>";
    results.forEach(function (r) {
      html += `<button type="button" class="related-btn" data-q="${escHtml(r.item.q)}">${escHtml(r.item.q)}</button>`;
    });
    wrapper.innerHTML = html;

    wrapper.querySelectorAll(".related-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        handleQuery(btn.getAttribute("data-q"));
      });
    });

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendSuggestedButtons() {
    const suggestions = [
      "2026 국민참여 청렴콘텐츠 공모전에는 누가 참여할 수 있나요?",
      "어떤 부문에 출품할 수 있나요?",
      "작품 접수 기간은 언제인가요?",
      "공모전에는 어떻게 응모하나요?",
      "생성형 AI를 사용해서 작품을 만들어도 되나요?",
    ];

    const wrapper = document.createElement("div");
    wrapper.className = "suggested-questions";

    suggestions.forEach(function (q) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggest-btn";
      btn.textContent = q;
      btn.addEventListener("click", function () {
        handleQuery(q);
      });
      wrapper.appendChild(btn);
    });

    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function handleQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return;

    addUserMessage(trimmed);
    input.value = "";

    if (faqData.length === 0) {
      addMessage("bot", "<p>FAQ 데이터를 로드 중입니다. 잠시 후 다시 시도해 주세요.</p>");
      return;
    }

    renderAnswer(searchFAQ(trimmed));
  }

  if (btnSend) {
    btnSend.addEventListener("click", function () {
      handleQuery(input.value);
    });
  }

  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleQuery(input.value);
      }
    });
  }

  document.querySelectorAll(".suggest-btn[data-q]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      handleQuery(btn.getAttribute("data-q"));
    });
  });

  async function init() {
    try {
      /* GitHub Pages / 브라우저가 예전 faq.json을 붙잡지 않도록 캐시 우회 */
      const res = await fetch("data/faq.json?t=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("faq.json 로드 실패 (" + res.status + ")");
      faqData = await res.json();
      if (!Array.isArray(faqData) || faqData.length === 0) {
        throw new Error("faq.json 형식 오류 또는 빈 배열");
      }
      console.info("[chatbot.js] FAQ 로드 완료:", faqData.length + "개 항목");
    } catch (err) {
      console.warn("[chatbot.js]", err.message);
      faqData = [];
    }
  }

  init();
})();
