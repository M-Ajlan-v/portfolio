const filenames = [
  "site", "hero", "skills", "projects", "about",
  "experience", "education", "certificates", "contact", "socials"
];

const main = document.querySelector("#main");
const dialog = document.querySelector(".detail-dialog");
const dialogContent = document.querySelector(".dialog-content");
const closeDialog = document.querySelector(".close-dialog");

let data;
let labels;
let previousFocus;

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }
  return node;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function visible(items) {
  return array(items).filter(item => item && item.enabled !== false);
}

function safeURL(value, image = false) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const url = new URL(value.trim(), document.baseURI);
    const allowed = image
      ? ["http:", "https:"]
      : ["http:", "https:", "mailto:", "tel:"];

    return allowed.includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function link(text, href, className = "") {
  const url = safeURL(href);
  if (!url) return null;

  const node = element("a", className, text);
  node.href = url;

  const parsed = new URL(url);
  if (
    ["http:", "https:"].includes(parsed.protocol) &&
    parsed.origin !== location.origin
  ) {
    node.target = "_blank";
    node.rel = "noopener noreferrer";
  }

  return node;
}

function append(parent, ...children) {
  children.filter(Boolean).forEach(child => parent.append(child));
  return parent;
}

function tags(values, limit = Infinity) {
  const container = element("div", "tags");
  const items = array(values).filter(value => typeof value === "string");

  items.slice(0, limit).forEach(value => {
    container.append(element("span", "tag", value));
  });

  if (items.length > limit) {
    container.append(element("span", "tag", `+${items.length - limit}`));
  }

  return container;
}

function socials() {
  const container = element("div", "socials");

  visible(data.socials.items).forEach(item => {
    append(container, link(item.label, item.url));
  });

  return container;
}

function section(id, content) {
  const outer = element("section", "section");
  outer.id = id;

  const inner = element("div", "container");
  const heading = element("div", "section-heading");

  if (content.eyebrow) {
    heading.append(element("span", "eyebrow", content.eyebrow));
  }

  const title = element("h2", "", content.title);
  title.id = `${id}-heading`;
  outer.setAttribute("aria-labelledby", title.id);
  heading.append(title);

  if (content.description) {
    heading.append(
      element("p", "section-description", content.description)
    );
  }

  append(inner, heading);
  outer.append(inner);

  return { outer, inner };
}

function mediaFrame(src, alt, fallbackText, className = "project-cover") {
  const frame = element("div", className);
  const url = safeURL(src, true);
  const fallback = () => {
    frame.replaceChildren(
      element("span", "cover-fallback", fallbackText || "")
    );
  };

  if (!url) {
    fallback();
    return frame;
  }

  const image = element("img");
  image.src = url;
  image.alt = alt || "";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", fallback, { once: true });

  frame.append(image);
  return frame;
}

function validAction(item) {
  if (item.enabled === false || !safeURL(item.href)) return false;

  if (item.href.startsWith("#")) {
    return Boolean(document.getElementById(item.href.slice(1)));
  }

  return true;
}

function addActions(parent, items) {
  visible(items).filter(validAction).forEach(item => {
    const style = ["primary", "secondary", "text"].includes(item.style)
      ? item.style
      : "secondary";

    append(parent, link(item.label, item.href, `button ${style}`));
  });

  parent.hidden = parent.children.length === 0;
}

function renderHero() {
  const content = data.hero;
  if (content.enabled === false) return null;

  const outer = element("section", "hero");
  outer.id = "hero";

  const grid = element("div", "container hero-grid");
  const copy = element("div", "hero-copy reveal");

  append(
    copy,
    content.eyebrow
      ? element("span", "eyebrow", content.eyebrow)
      : null,
    element("div", "hero-name", content.name),
    content.role ? element("div", "hero-role", content.role) : null
  );

  const heading = element("h1");
  array(content.headline).forEach(part => {
    heading.append(
      element(
        "span",
        `headline-part${part.highlight ? " highlight" : ""}`,
        part.text
      )
    );
  });

  if (!heading.childNodes.length) {
    heading.textContent = content.name || data.site.brand.name;
  }

  copy.append(heading);

  array(content.paragraphs).forEach(text => {
    if (text) copy.append(element("p", "", text));
  });

  if (content.availability?.enabled && content.availability.text) {
    copy.append(
      element("div", "availability", content.availability.text)
    );
  }

  const actions = element("div", "actions");
  actions.dataset.heroActions = "";
  copy.append(actions);

  if (content.showSocials) copy.append(socials());

  grid.append(copy);

  const portraitURL = safeURL(content.portrait?.src, true);
  const sceneEnabled = content.visual?.enabled !== false &&
    content.visual?.enable3D === true;

  if (portraitURL || sceneEnabled) {
    const visual = element("div", "hero-visual reveal");

    if (portraitURL) {
      const frame = element("div", "portrait-frame");
      const image = element("img", "portrait");
      image.src = portraitURL;
      image.alt = content.portrait.alt || "";
      image.fetchPriority = "high";

      const position = content.portrait.position;
      if (typeof position === "string" &&
        CSS.supports("object-position", position)) {
        image.style.objectPosition = position;
      }

      image.addEventListener("error", () => {
        frame.remove();
        visual.classList.add("scene-only");

        if (!visual.querySelector(".scene")) {
          visual.remove();
          grid.classList.add("single");
        }
      }, { once: true });

      frame.append(image);
      visual.append(frame);
    } else {
      visual.classList.add("scene-only");
    }

    if (sceneEnabled) {
      const scene = element("div", "scene");
      scene.setAttribute("aria-hidden", "true");
      visual.append(scene);

      const start = async () => {
        try {
          const { mountScene } = await import("./scene.js");
          await mountScene(scene, {
            accent: data.site.theme.accent,
            secondary: data.site.theme.secondary,
            motion: data.site.motion.enabled !== false,
            parallax: content.visual.enableParallax !== false
          });
        } catch (error) {
          console.warn("3D scene unavailable:", error);
          scene.remove();

          if (!visual.querySelector(".portrait-frame")) {
            visual.remove();
            grid.classList.add("single");
          }
        }
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(start, { timeout: 1800 });
      } else {
        setTimeout(start, 200);
      }
    }

    if (content.visual?.caption) {
      visual.append(
        element("div", "visual-caption", content.visual.caption)
      );
    }

    grid.append(visual);
  } else {
    grid.classList.add("single");
  }

  outer.append(grid);
  return outer;
}

function renderSkills() {
  const content = data.skills;
  const groups = visible(content.groups)
    .filter(group => array(group.items).length);

  if (content.enabled === false || !groups.length) return null;

  const { outer, inner } = section("skills", content);
  const grid = element("div", "skill-groups");

  groups.forEach(group => {
    const card = element("article", "skill-group");
    append(card, element("h3", "", group.title), tags(group.items));
    grid.append(card);
  });

  inner.append(grid);
  return outer;
}

function openDetails(item, trigger, certificate = false) {
  previousFocus = trigger;
  dialogContent.replaceChildren();

  const title = element("h2", "", item.name);
  title.id = "detail-title";
  dialogContent.append(title);

  const images = array(item.images)
    .map(image => typeof image === "string"
      ? { src: image, alt: item.name }
      : image
    )
    .filter(image => image && safeURL(image.src, true));

  if (images.length) {
    const gallery = element("div", "gallery");
    const stage = element("div", "gallery-stage");
    const controls = element("div", "gallery-controls");

    const previous = element(
      "button", "gallery-button", labels.previous
    );
    const next = element("button", "gallery-button", labels.next);
    previous.type = next.type = "button";

    const counter = element("span", "gallery-counter");
    counter.setAttribute("aria-live", "polite");

    let index = 0;
    let startX = 0;
    let startY = 0;

    const showImage = () => {
      const imageData = images[index];
      const image = element("img");
      image.src = safeURL(imageData.src, true);
      image.alt = imageData.alt || item.name;
      image.decoding = "async";

      const enlarged = link("", imageData.src);
      enlarged.target = "_blank";
      enlarged.rel = "noopener noreferrer";
      enlarged.setAttribute("aria-label", labels.enlargeImage);
      enlarged.append(image);

      image.addEventListener("error", () => {
        stage.replaceChildren(
          element("p", "muted", labels.imageUnavailable)
        );
      }, { once: true });

      stage.replaceChildren(enlarged);
      counter.textContent = `${index + 1} / ${images.length}`;
    };

    const move = direction => {
      index = (index + direction + images.length) % images.length;
      showImage();
    };

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));

    stage.addEventListener("touchstart", event => {
      startX = event.changedTouches[0].clientX;
      startY = event.changedTouches[0].clientY;
    }, { passive: true });

    stage.addEventListener("touchend", event => {
      const dx = event.changedTouches[0].clientX - startX;
      const dy = event.changedTouches[0].clientY - startY;

      if (images.length > 1 && Math.abs(dx) > 50 &&
        Math.abs(dx) > Math.abs(dy)) {
        move(dx < 0 ? 1 : -1);
      }
    }, { passive: true });

    append(controls, previous, counter, next);
    controls.hidden = images.length < 2;

    append(gallery, stage, controls);
    dialogContent.append(gallery);
    showImage();
  }

  if (item.description) {
    dialogContent.append(
      element("p", "detail-description", item.description)
    );
  }

  if (certificate && item.issuer) {
    dialogContent.append(element("p", "muted", item.issuer));
  }

  if (array(item.stack).length) {
    append(
      dialogContent,
      element("h3", "", labels.technology),
      tags(item.stack)
    );
  }

  const actions = element("div", "actions");

  append(
    actions,
    link(labels.github, item.github, "button secondary"),
    link(labels.demo, item.demo, "button primary"),
    certificate
      ? link(labels.verify, item.url, "button primary")
      : null
  );

  if (actions.children.length) dialogContent.append(actions);

  dialog.showModal();
  document.body.classList.add("dialog-open");
  dialog.scrollTop = 0;
  closeDialog.focus();

  const motionAllowed =
    data.site.motion?.enabled !== false &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (motionAllowed && dialog.animate) {
    dialog.animate(
      [
        {
          opacity: 0,
          transform: "translateY(16px) scale(.985)"
        },
        {
          opacity: 1,
          transform: "translateY(0) scale(1)"
        }
      ],
      {
        duration: 320,
        easing: "cubic-bezier(.22, 1, .36, 1)"
      }
    );
  }
}

function projectCard(item, certificate = false) {
  const card = element("button", "project-card");
  card.type = "button";

  const first = array(item.images)[0];
  const image = typeof first === "string" ? first : first?.src;
  const cover = item.cover || image;

  card.append(
    mediaFrame(
      cover,
      item.name,
      item.coverLabel || item.name?.slice(0, 2).toUpperCase()
    )
  );

  const body = element("div", "project-body");

  if (item.status) {
    body.append(element("span", "project-status", item.status));
  } else if (item.featured) {
    body.append(element("span", "project-status", labels.featured));
  }

  body.append(element("h3", "", item.name));

  if (item.summary || item.description) {
    body.append(
      element(
        "p",
        "project-summary",
        item.summary || item.description
      )
    );
  }

  if (certificate && item.issuer) {
    body.append(element("p", "muted", item.issuer));
  }

  if (array(item.stack).length) body.append(tags(item.stack, 3));

  body.append(element("span", "card-action", labels.viewDetails));
  card.append(body);

  card.addEventListener("click", () => {
    openDetails(item, card, certificate);
  });

  return card;
}

function renderProjects() {
  const content = data.projects;
  const items = visible(content.items);

  if (content.enabled === false || !items.length) return null;

  const { outer, inner } = section("projects", content);

  const sorted = [...items].sort((a, b) =>
    Number(Boolean(b.featured)) - Number(Boolean(a.featured))
  );

  const categories = [
    ...new Set(sorted.flatMap(item => array(item.categories)))
  ].filter(value => typeof value === "string" && value.trim());

  const controls = element("div", "project-controls");
  const filters = element("div", "filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", labels.filters);

  const search = element("input", "search");
  search.type = "search";
  search.placeholder = labels.search;
  search.setAttribute("aria-label", labels.search);
  search.hidden = items.length < (content.searchThreshold || 9);

  const grid = element("div", "project-grid");
  const empty = element("p", "muted", labels.noResults);
  empty.setAttribute("role", "status");

  const more = element("button", "load-more", labels.loadMore);
  more.type = "button";

  const pageSize = Math.max(1, Number(content.pageSize) || 6);
  let selected = null;
  let shown = pageSize;

  function render() {
    const query = search.value.trim().toLowerCase();

    const matching = sorted.filter(item => {
      const categoryMatch = selected === null ||
        array(item.categories).includes(selected);

      const searchable = [
        item.name,
        item.summary,
        item.description,
        ...array(item.stack)
      ].join(" ").toLowerCase();

      return categoryMatch && searchable.includes(query);
    });

    grid.replaceChildren(
      ...matching.slice(0, shown).map(item => projectCard(item))
    );

    empty.hidden = matching.length !== 0;
    more.hidden = matching.length <= shown;
  }

  [null, ...categories].forEach(category => {
    const filter = element(
      "button",
      "filter",
      category === null ? labels.allProjects : category
    );

    filter.type = "button";
    filter.setAttribute("aria-pressed", String(category === null));

    filter.addEventListener("click", () => {
      selected = category;
      shown = pageSize;

      filters.querySelectorAll("button").forEach(button => {
        button.setAttribute(
          "aria-pressed", String(button === filter)
        );
      });

      render();
    });

    filters.append(filter);
  });

  filters.hidden = !categories.length;

  search.addEventListener("input", () => {
    shown = pageSize;
    render();
  });

  more.addEventListener("click", () => {
    shown += pageSize;
    render();
  });

  append(controls, filters, search);
  append(inner, controls, grid, empty, more);
  render();

  return outer;
}

function renderAbout() {
  const content = data.about;

  if (content.enabled === false ||
    (!array(content.paragraphs).length &&
      !visible(content.highlights).length &&
      !content.image)) {
    return null;
  }

  const { outer, inner } = section("about", content);
  const layout = element("div", "about-layout");
  const copy = element("div", "about-copy");

  if (content.image) {
    copy.append(
      mediaFrame(
        content.image,
        content.imageAlt,
        data.hero.name,
        "project-cover"
      )
    );
  }

  array(content.paragraphs).forEach(text => {
    copy.append(element("p", "", text));
  });

  const highlights = element("div", "highlights");

  visible(content.highlights).forEach(item => {
    const card = element("div", "highlight-item");
    append(
      card,
      element("strong", "", item.title),
      item.text ? element("p", "", item.text) : null
    );
    highlights.append(card);
  });

  append(layout, copy, highlights);
  inner.append(layout);
  return outer;
}

function renderTimeline(id) {
  const content = data[id];
  const items = visible(content.items);

  if (content.enabled === false || !items.length) return null;

  const { outer, inner } = section(id, content);
  const timeline = element("div", "timeline");

  items.forEach(item => {
    const row = element("article", "timeline-item");
    const body = element("div", "timeline-body");

    append(
      body,
      element("h3", "", item.title),
      item.organization
        ? element("p", "", item.organization)
        : null
    );

    array(item.paragraphs).forEach(text => {
      body.append(element("p", "", text));
    });

    append(
      row,
      element("div", "timeline-date", item.period || ""),
      body
    );

    timeline.append(row);
  });

  inner.append(timeline);
  return outer;
}

function renderCertificates() {
  const content = data.certificates;
  const items = visible(content.items);

  if (content.enabled === false || !items.length) return null;

  const { outer, inner } = section("certificates", content);
  const grid = element("div", "certificate-grid");

  const size = Math.max(1, Number(content.pageSize) || 6);
  let shown = size;

  const more = element("button", "load-more", labels.loadMore);
  more.type = "button";

  const render = () => {
    grid.replaceChildren(
      ...items.slice(0, shown).map(item => projectCard(item, true))
    );
    more.hidden = shown >= items.length;
  };

  more.addEventListener("click", () => {
    shown += size;
    render();
  });

  append(inner, grid, more);
  render();
  return outer;
}

function renderContact() {
  const content = data.contact;
  if (content.enabled === false) return null;

  const { outer, inner } = section("contact", content);
  outer.classList.add("contact-section");

  const layout = element("div", "contact-layout");
  const copy = element("div", "contact-copy");

  if (content.text) copy.append(element("p", "muted", content.text));

  if (content.email) {
    append(
      copy,
      link(
        content.email,
        `mailto:${content.email}`,
        "contact-email"
      )
    );
  }

  copy.append(socials());
  layout.append(copy);

  const formConfig = content.form || {};
  const endpoint = safeURL(formConfig.endpoint);
  const endpointURL = endpoint ? new URL(endpoint) : null;

  if (formConfig.enabled &&
    endpointURL?.protocol === "https:") {
    const form = element("form", "contact-form");
    form.method = "post";
    form.action = endpoint;

    [
      ["name", "text", formConfig.nameLabel],
      ["email", "email", formConfig.emailLabel],
      ["message", "textarea", formConfig.messageLabel]
    ].forEach(([name, type, title]) => {
      const label = element("label", "", title);
      const input = element(type === "textarea" ? "textarea" : "input");

      if (type !== "textarea") input.type = type;
      input.name = name;
      input.required = true;
      input.maxLength = type === "textarea" ? 5000 : 200;

      if (name === "name") input.autocomplete = "name";
      if (name === "email") input.autocomplete = "email";

      label.append(input);
      form.append(label);
    });

    const honeypot = element("input", "honeypot");
    honeypot.name = "_gotcha";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");

    const submit = element(
      "button", "button primary", formConfig.submitLabel
    );
    submit.type = "submit";

    const status = element("p", "form-status");
    status.setAttribute("role", "status");

    append(form, honeypot, submit, status);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity() || submit.disabled) return;
      if (honeypot.value) return;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      submit.disabled = true;
      submit.textContent = formConfig.sendingLabel;
      status.textContent = "";

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (!response.ok) throw new Error("Form submission failed");

        form.reset();
        status.textContent = formConfig.successMessage;
      } catch {
        status.textContent = formConfig.errorMessage;
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
        submit.textContent = formConfig.submitLabel;
      }
    });

    layout.append(form);
  } else {
    const note = element("div", "highlight-item");
    if (content.directTitle) {
      note.append(element("h3", "", content.directTitle));
    }
    if (content.directText) {
      note.append(element("p", "muted", content.directText));
    }

    if (content.email) {
      const actions = element("div", "actions");

      const gmailURL = new URL("https://mail.google.com/mail/"); gmailURL.searchParams.set("view", "cm");
      gmailURL.searchParams.set("fs", "1");
      gmailURL.searchParams.set("to", content.email);
      gmailURL.searchParams.set(
        "su",
        content.emailSubject || ""
      );

      const gmail = link(
        content.gmailButton || "Open Gmail ↗",
        gmailURL.href,
        "button primary"
      );

      const copyButton = element(
        "button",
        "button secondary",
        content.copyButton || "Copy email"
      );

      copyButton.type = "button";

      const feedback = element("p", "contact-feedback");
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");

      copyButton.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard?.writeText) {
            throw new Error("Clipboard unavailable");
          }

          await navigator.clipboard.writeText(content.email);

          feedback.textContent =
            content.copiedMessage || "Email address copied.";
        } catch {
          feedback.textContent =
            content.copyFailedMessage ||
            "Select and copy the email address shown above.";

          const emailElement = copy.querySelector(".contact-email");

          if (emailElement) {
            const selection = window.getSelection();

            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(emailElement);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      });

      append(actions, gmail, copyButton);
      append(note, actions, feedback);
    }

    layout.append(note);
  }

  inner.append(layout);
  return outer;
}

function configureSite() {
  const site = data.site;
  labels = site.labels;

  document.documentElement.lang = site.language || "en";
  document.title = site.meta.title;

  [
    ['meta[name="description"]', site.meta.description],
    ['meta[property="og:title"]', site.meta.title],
    ['meta[property="og:description"]', site.meta.description],
    ['meta[property="og:image"]', safeURL(site.meta.image, true)]
  ].forEach(([selector, value]) => {
    document.querySelector(selector).content = value || "";
  });

  document.querySelector('meta[name="theme-color"]').content =
    site.theme.background;

  Object.entries(site.theme).forEach(([key, value]) => {
    if (
      ["background", "surface", "text", "muted", "accent", "secondary"]
        .includes(key) &&
      typeof value === "string" &&
      CSS.supports("color", value)
    ) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }
  });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const updateMotion = () => {
    const enabled = site.motion.enabled !== false && !reduced.matches;
    document.documentElement.classList.toggle("motion-on", enabled);
    document.documentElement.classList.toggle("motion-off", !enabled);
  };

  updateMotion();
  reduced.addEventListener("change", updateMotion);

  const skip = document.querySelector(".skip-link");
  skip.textContent = labels.skip;
  closeDialog.textContent = labels.close;

  const brand = document.querySelector(".brand");
  brand.setAttribute("aria-label", site.brand.name);
  brand.replaceChildren();

  if (safeURL(site.brand.logo, true)) {
    const image = element("img");
    image.src = safeURL(site.brand.logo, true);
    image.alt = "";
    image.addEventListener("error", () => image.remove(), { once: true });
    brand.append(image);
  } else if (site.brand.mark) {
    brand.append(element("span", "brand-mark", site.brand.mark));
  }

  brand.append(element("span", "", site.brand.name));

  const iconURL = safeURL(site.brand.favicon, true);
  if (iconURL) {
    const icon = element("link");
    icon.rel = "icon";
    icon.href = iconURL;
    document.head.append(icon);
  }

  const menu = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#navigation");
  menu.textContent = labels.menu;
  navigation.setAttribute("aria-label", labels.navigation);

  visible(site.navigation).forEach(item => {
    const target = document.getElementById(item.section);
    if (target) {
      append(navigation, link(item.label, `#${item.section}`));
    }
  });

  menu.hidden = !navigation.children.length;

  function closeMenu() {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }

  menu.addEventListener("click", () => {
    const open = navigation.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });

  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" &&
      navigation.classList.contains("open")) {
      closeMenu();
      menu.focus();
    }
  });

  const footer = document.querySelector(".footer");
  if (site.footer.enabled === false) {
    footer.hidden = true;
  } else {
    const inner = element("div", "container footer-inner");
    append(
      inner,
      element(
        "span",
        "",
        (site.footer.text || "")
          .replaceAll("{year}", String(new Date().getFullYear()))
      ),
      socials(),
      link(labels.backToTop, "#main")
    );
    footer.append(inner);
  }

  const heroActions = document.querySelector("[data-hero-actions]");
  if (heroActions) addActions(heroActions, data.hero.buttons);
}

function validate() {
  if (!data.site.labels || !data.site.theme || !data.site.meta) {
    throw new Error("site.json needs labels, theme, and meta objects.");
  }

  const sections = [
    "projects", "experience", "education", "certificates", "socials"
  ];

  sections.forEach(name => {
    if (!Array.isArray(data[name].items)) {
      throw new Error(`${name}.json: items must be an array.`);
    }

    const ids = new Set();

    data[name].items.forEach((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`${name}.json: invalid item ${index + 1}.`);
      }

      if (!item.id || ids.has(item.id)) {
        throw new Error(
          `${name}.json: every item needs a unique non-empty id.`
        );
      }

      ids.add(item.id);

      if (["projects", "certificates"].includes(name) && !item.name) {
        throw new Error(`${name}.json: item ${item.id} needs a name.`);
      }
    });
  });
}

closeDialog.addEventListener("click", () => dialog.close());

dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;

  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  ) {
    dialog.close();
  }
});

dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  if (previousFocus?.isConnected) previousFocus.focus();
});

function setupHeroParallax() {
  const hero = document.querySelector(".hero");
  const visual = hero?.querySelector(".hero-visual");

  if (!hero || !visual) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");

  let active = true;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function allowed() {
    return (
      data.site.motion.enabled !== false &&
      data.hero.visual?.enableParallax !== false &&
      !reduced.matches
    );
  }

  function reset() {
    hero.style.setProperty("--px", "0");
    hero.style.setProperty("--py", "0");
    hero.style.setProperty("--scroll-shift", "0px");
  }

  function render() {
    frame = 0;

    if (!allowed()) {
      reset();
      return;
    }

    if (!active || document.hidden) return;

    const rect = hero.getBoundingClientRect();
    const scrollShift = Math.max(
      -45,
      Math.min(45, -rect.top * 0.075)
    );

    hero.style.setProperty("--px", String(pointerX));
    hero.style.setProperty("--py", String(pointerY));
    hero.style.setProperty(
      "--scroll-shift",
      `${scrollShift.toFixed(2)}px`
    );
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  hero.addEventListener("pointermove", event => {
    if (!allowed() || !finePointer.matches) return;

    const rect = visual.getBoundingClientRect();

    pointerX = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientX - rect.left) / rect.width - 0.5) * 2
      )
    );

    pointerY = Math.max(
      -1,
      Math.min(
        1,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2
      )
    );

    schedule();
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    schedule();
  });

  window.addEventListener("scroll", () => {
    if (active && allowed()) schedule();
  }, { passive: true });

  window.addEventListener("resize", schedule, { passive: true });

  reduced.addEventListener("change", () => {
    pointerX = 0;
    pointerY = 0;
    reset();
    schedule();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });

  const observer = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active) schedule();
  });

  observer.observe(hero);
  schedule();
}
function setupPremiumEffects() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

  const watched = new WeakSet();
  const pending = new Set();
  const animations = new Set();

  const revealSelector = [
    ".hero-copy",
    ".hero-visual",
    ".section-heading",
    ".skill-group",
    ".project-card",
    ".about-copy",
    ".highlight-item",
    ".timeline-item",
    ".contact-copy",
    ".contact-form"
  ].join(",");

  const surfaceSelector = [
    ".project-card",
    ".highlight-item",
    ".timeline-item"
  ].join(",");

  function motionAllowed() {
    return (
      data.site.motion?.enabled !== false &&
      !reduced.matches
    );
  }

  function play(node, keyframes, options) {
    if (!motionAllowed() || !node.animate) return;

    const animation = node.animate(keyframes, options);
    animations.add(animation);

    const forget = () => animations.delete(animation);
    animation.addEventListener("finish", forget, { once: true });
    animation.addEventListener("cancel", forget, { once: true });

    return animation;
  }

  function reveal(node) {
    if (!node.isConnected || !motionAllowed()) return;

    const siblings = [...node.parentElement.children];
    const index = Math.max(0, siblings.indexOf(node));

    play(
      node,
      [
        {
          opacity: 0,
          translate: "0 20px"
        },
        {
          opacity: 1,
          translate: "0 0"
        }
      ],
      {
        duration: 650,
        delay: Math.min(index, 4) * 55,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "backwards"
      }
    );
  }

  const intersection = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        intersection.unobserve(entry.target);
        pending.delete(entry.target);
        reveal(entry.target);
      });
    }, {
      threshold: 0,
      rootMargin: "0px 0px -20px 0px"
    })
    : null;

  function collect(root, selector) {
    const nodes = [];

    if (root instanceof Element && root.matches(selector)) {
      nodes.push(root);
    }

    if (root.querySelectorAll) {
      nodes.push(...root.querySelectorAll(selector));
    }

    return nodes;
  }

  function register(root) {
    collect(root, surfaceSelector).forEach(node => {
      node.classList.add("pointer-surface");
    });

    collect(root, revealSelector).forEach(node => {
      if (watched.has(node)) return;
      watched.add(node);

      if (intersection && motionAllowed()) {
        pending.add(node);
        intersection.observe(node);
      }
    });
  }

  register(main);

  const mutations = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) register(node);
      });
    });

    // Filtering removes cards. Stop observing detached elements.
    pending.forEach(node => {
      if (!node.isConnected) {
        intersection?.unobserve(node);
        pending.delete(node);
      }
    });
  });

  mutations.observe(main, {
    childList: true,
    subtree: true
  });

  let pointerFrame = 0;
  let activeSurface = null;
  let clientX = 0;
  let clientY = 0;

  main.addEventListener("pointermove", event => {
    if (!finePointer.matches || !motionAllowed()) return;

    const surface = event.target instanceof Element
      ? event.target.closest(".pointer-surface")
      : null;

    if (!surface) return;

    activeSurface = surface;
    clientX = event.clientX;
    clientY = event.clientY;

    if (pointerFrame) return;

    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;

      if (!activeSurface?.isConnected) return;

      const rect = activeSurface.getBoundingClientRect();

      activeSurface.style.setProperty(
        "--light-x",
        `${clientX - rect.left}px`
      );

      activeSurface.style.setProperty(
        "--light-y",
        `${clientY - rect.top}px`
      );
    });
  }, { passive: true });

  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;

    animations.forEach(animation => animation.cancel());

    pending.forEach(node => {
      intersection?.unobserve(node);
    });

    pending.clear();
  });
}
function setupTouchScrollEffects() {
  if (!("IntersectionObserver" in window)) return;

  const touchDevice = matchMedia(
    "(hover: none), (pointer: coarse)"
  );

  const reducedMotion = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const selector = [
    ".skill-group .tag",
    ".project-card",
    ".timeline-item",
    ".highlight-item"
  ].join(",");

  const observed = new Set();
  let enabled = false;
  let viewportFrame = 0;

  function allowed() {
    return (
      touchDevice.matches &&
      !reducedMotion.matches &&
      data.site.motion?.enabled !== false
    );
  }

  /*
   * The active area occupies the middle 60% of the viewport.
   * Pixel margins avoid percentage root-margin sizing surprises.
   */
  function createObserver() {
    const inset = Math.round(
      document.documentElement.clientHeight * 0.2
    );

    return new IntersectionObserver(entries => {
      if (!enabled) return;

      entries.forEach(entry => {
        if (!entry.target.isConnected) return;

        entry.target.classList.toggle(
          "is-scroll-active",
          entry.isIntersecting
        );
      });
    }, {
      root: null,
      rootMargin: `-${inset}px 0px -${inset}px 0px`,
      threshold: 0
    });
  }

  let observer = createObserver();

  function register(root) {
    if (!enabled || !(root instanceof Element)) return;

    const nodes = [];

    if (root.matches(selector)) nodes.push(root);
    nodes.push(...root.querySelectorAll(selector));

    nodes.forEach(node => {
      if (observed.has(node)) return;

      observed.add(node);
      observer.observe(node);
    });
  }

  function clear() {
    observer.disconnect();

    observed.forEach(node => {
      node.classList.remove("is-scroll-active");
    });

    observed.clear();
  }

  function refresh() {
    enabled = false;
    clear();

    observer = createObserver();
    enabled = allowed();

    if (enabled) register(main);
  }

  const mutations = new MutationObserver(records => {
    if (!enabled) return;

    // Release removed cards after filtering or list updates.
    observed.forEach(node => {
      if (!main.contains(node)) {
        observer.unobserve(node);
        node.classList.remove("is-scroll-active");
        observed.delete(node);
      }
    });

    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) register(node);
      });
    });
  });

  mutations.observe(main, {
    childList: true,
    subtree: true
  });

  touchDevice.addEventListener("change", refresh);
  reducedMotion.addEventListener("change", refresh);

  window.addEventListener("resize", () => {
    if (viewportFrame) return;

    viewportFrame = requestAnimationFrame(() => {
      viewportFrame = 0;
      refresh();
    });
  }, { passive: true });

  refresh();
}

async function start() {
  const entries = await Promise.all(
    filenames.map(async name => {
      const response = await fetch(`./content/${name}.json`, {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error(`Cannot load content/${name}.json`);
      }

      try {
        return [name, await response.json()];
      } catch {
        throw new Error(`Invalid JSON in content/${name}.json`);
      }
    })
  );

  data = Object.fromEntries(entries);
  validate();
  labels = data.site.labels;

  main.replaceChildren();

  const builders = {
    hero: renderHero,
    skills: renderSkills,
    projects: renderProjects,
    about: renderAbout,
    experience: () => renderTimeline("experience"),
    education: () => renderTimeline("education"),
    certificates: renderCertificates,
    contact: renderContact
  };

  [...new Set(array(data.site.sectionOrder))].forEach(id => {
    const node = builders[id]?.();
    if (node) main.append(node);
  });

  configureSite();
  setupHeroParallax();
  setupPremiumEffects();
  setupTouchScrollEffects();
}

start().catch(error => {
  console.error(error);
  const box = element("div", "container failure");
  append(
    box,
    element("h1", "", "Portfolio could not load"),
    element("p", "", error.message),
    element(
      "p",
      "muted",
      "Check the JSON files and open this folder with a local HTTP server."
    )
  );
  main.replaceChildren(box);
});