const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const fileName = process.argv[2];

if (!fileName) {
  console.log('Uso: node smart-replay.js <archivo.json>');
  console.log('Ejemplo: node smart-replay.js smart_session_1780789999999.json');
  process.exit(1);
}

const recordingsDir = path.join(__dirname, 'recordings');
const replayResultsDir = path.join(recordingsDir, 'replay_results');

if (!fs.existsSync(replayResultsDir)) {
  fs.mkdirSync(replayResultsDir, { recursive: true });
}

const filePath = path.isAbsolute(fileName)
  ? fileName
  : path.join(recordingsDir, fileName);

if (!fs.existsSync(filePath)) {
  console.log(`No existe el archivo: ${filePath}`);
  process.exit(1);
}

const recording = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const replaySessionId = recording.sessionId || `replay_${Date.now()}`;
const outputPath = path.join(replayResultsDir, `smart_replay_${fileName.split('_').pop().replace('.json', '') || 'unknown'}_${Date.now()}.json`);

const events = [];
const pageSnapshots = [];
const siteMap = [];
const replayErrors = [];

function now() {
  return new Date().toISOString();
}

function cleanText(text = '', max = 180) {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function regexEscape(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeKey(value = '') {
  return cleanText(value, 100)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseMoney(value = '') {
  const raw = String(value).replace(/[^0-9.-]/g, '');
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNoiseUrl(url = '') {
  const u = String(url).toLowerCase();

  return (
    u.includes('google.com') ||
    u.includes('googlesyndication.com') ||
    u.includes('doubleclick.net') ||
    u.includes('adservice') ||
    u.includes('google_vignette') ||
    u.includes('youtube.com') ||
    u.includes('facebook.com') ||
    u.includes('analytics') ||
    u.includes('tracking')
  );
}

function isNoiseSelector(selector = '') {
  const s = String(selector).toLowerCase();

  return (
    s.includes('aswift') ||
    s.includes('adsbygoogle') ||
    s.includes('googlesyndication') ||
    s.includes('doubleclick') ||
    s.includes('google_vignette') ||
    s.includes('youtube') ||
    s.includes('yt-') ||
    s.includes('iframe')
  );
}

async function waitForPageReady(page) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
  } catch {}

  try {
    await page.waitForLoadState('networkidle', { timeout: 3000 });
  } catch {}

  await page.waitForTimeout(500);
}

async function hideNoise(page) {
  await page.addStyleTag({
    content: `
      iframe[id^="aswift"],
      iframe[name^="aswift"],
      .adsbygoogle,
      ins.adsbygoogle,
      [id*="google_vignette"],
      [class*="adsbygoogle"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `
  }).catch(() => {});
}

async function askHiddenValue(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(promptText, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function getLocatorFromCandidate(page, candidate) {
  if (!candidate) return null;

  if (candidate.strategy === 'testid' && candidate.selector) {
    return page.locator(candidate.selector);
  }

  if (candidate.strategy === 'role_name' && candidate.role && candidate.name) {
    return page.getByRole(candidate.role, {
      name: new RegExp(regexEscape(candidate.name), 'i')
    });
  }

  if (candidate.strategy === 'placeholder' && candidate.selector) {
    return page.getByPlaceholder(candidate.selector);
  }

  if (candidate.strategy === 'text' && candidate.selector) {
    return page.getByText(candidate.selector, { exact: false });
  }

  if (candidate.strategy === 'id' && candidate.selector) {
    return page.locator(candidate.selector);
  }

  if (candidate.selector) {
    return page.locator(candidate.selector);
  }

  return null;
}

async function visibleCount(locator) {
  try {
    const count = await locator.count();
    let visible = 0;

    for (let i = 0; i < Math.min(count, 5); i++) {
      if (await locator.nth(i).isVisible().catch(() => false)) {
        visible++;
      }
    }

    return visible;
  } catch {
    return 0;
  }
}

async function waitForPossibleModal(page) {
  try {
    const modal = page.locator(
      '.modal:visible, .modal-dialog:visible, .modal-content:visible, [role="dialog"]:visible'
    ).first();

    await modal.waitFor({ state: 'visible', timeout: 2500 });

    const text = await modal.innerText().catch(() => '');

    if (text) {
      console.log(`[MODAL DETECTED] ${text.replace(/\s+/g, ' ').trim().slice(0, 120)}`);
    }

    return modal;
  } catch {
    return null;
  }
}

async function clickInsideModalIfNeeded(page, event) {
  const modal = await waitForPossibleModal(page);

  if (!modal) return false;

  const targetText =
    event.accessibleName ||
    event.text ||
    event.placeholder ||
    event.name ||
    event.id ||
    '';

  if (!targetText) return false;

  const candidates = [
    modal.getByRole('link', { name: new RegExp(regexEscape(targetText), 'i') }),
    modal.getByRole('button', { name: new RegExp(regexEscape(targetText), 'i') }),
    modal.getByText(targetText, { exact: false })
  ];

  for (const locator of candidates) {
    try {
      const target = locator.first();

      await target.waitFor({ state: 'visible', timeout: 1500 });
      await target.scrollIntoViewIfNeeded();
      await target.click({ timeout: 1500 });

      console.log(`[OK MODAL CLICK] ${targetText}`);
      return true;
    } catch {
      // intentar siguiente
    }
  }

  return false;
}

async function smartClick(page, event) {
  await hideNoise(page);

  const modalClicked = await clickInsideModalIfNeeded(page, event);

  if (modalClicked) {
    await waitForPageReady(page);
    return true;
  }

  const candidates = event.selectorCandidates || [];
  const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  for (const candidate of sorted) {
    try {
      const locator = await getLocatorFromCandidate(page, candidate);
      if (!locator) continue;

      const count = await visibleCount(locator);
      if (count === 0) continue;

      const target = locator.first();

      await target.waitFor({ state: 'visible', timeout: 2500 });
      await target.scrollIntoViewIfNeeded();

      try {
        await target.click({ timeout: 2500 });
      } catch {
        await target.click({ timeout: 2500, force: true });
      }

      console.log(`[OK CLICK] ${event.intent} usando ${candidate.strategy}`);

      await waitForPageReady(page);
      await waitForPossibleModal(page);

      return true;
    } catch {
      // probar siguiente selector
    }
  }

  console.log(`[FAIL CLICK] ${event.intent} target="${event.accessibleName || event.text || event.placeholder || event.name || event.id}"`);
  return false;
}

async function smartFill(page, event) {
  await hideNoise(page);

  let value = event.value ?? '';

  if (event.sensitive || value === '__PASSWORD_NOT_STORED__') {
    value = await askHiddenValue(`Valor para campo sensible "${event.placeholder || event.name || event.id || event.intent}": `);
  }

  const candidates = event.selectorCandidates || [];
  const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  for (const candidate of sorted) {
    try {
      const locator = await getLocatorFromCandidate(page, candidate);
      if (!locator) continue;

      const count = await visibleCount(locator);
      if (count === 0) continue;

      const target = locator.first();

      await target.waitFor({ state: 'visible', timeout: 3000 });
      await target.scrollIntoViewIfNeeded();

      await target.click({ timeout: 3000 });
      await target.fill('');
      await target.fill(String(value), { timeout: 3000 });

      await target.evaluate((el) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      console.log(`[OK FILL] ${event.intent} value="${value}" usando ${candidate.strategy}`);
      await waitForPageReady(page);
      return true;
    } catch {
      // probar siguiente selector
    }
  }

  console.log(`[FAIL FILL] ${event.intent} value="${value}"`);
  return false;
}

async function smartSelect(page, event) {
  await hideNoise(page);

  const candidates = event.selectorCandidates || [];
  const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  for (const candidate of sorted) {
    try {
      const locator = await getLocatorFromCandidate(page, candidate);
      if (!locator) continue;

      const count = await visibleCount(locator);
      if (count === 0) continue;

      const target = locator.first();

      await target.waitFor({ state: 'visible', timeout: 2500 });
      await target.scrollIntoViewIfNeeded();
      await target.selectOption(String(event.value), { timeout: 2500 });

      console.log(`[OK SELECT] ${event.intent} usando ${candidate.strategy}`);
      await waitForPageReady(page);
      return true;
    } catch {
      // probar siguiente selector
    }
  }

  console.log(`[FAIL SELECT] ${event.intent} value="${event.value}"`);
  return false;
}

async function smartCheck(page, event) {
  await hideNoise(page);

  const candidates = event.selectorCandidates || [];
  const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));

  for (const candidate of sorted) {
    try {
      const locator = await getLocatorFromCandidate(page, candidate);
      if (!locator) continue;

      const count = await visibleCount(locator);
      if (count === 0) continue;

      const target = locator.first();

      await target.waitFor({ state: 'visible', timeout: 2500 });
      await target.scrollIntoViewIfNeeded();

      if (event.value === true || event.value === 'true') {
        await target.check({ timeout: 2500, force: true });
      } else {
        await target.uncheck({ timeout: 2500, force: true });
      }

      console.log(`[OK CHECK] ${event.intent} usando ${candidate.strategy}`);
      await waitForPageReady(page);
      return true;
    } catch {
      // probar siguiente selector
    }
  }

  console.log(`[FAIL CHECK] ${event.intent} value="${event.value}"`);
  return false;
}

async function inspectCurrentPage(page, reason = 'manual') {
  try {
    const snapshot = await page.evaluate((reason) => {
      function cleanText(text = '') {
        return String(text).replace(/\s+/g, ' ').trim();
      }

      function isVisible(el) {
        if (!el) return false;

        const style = window.getComputedStyle(el);

        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return false;
        }

        return !!(
          el.offsetWidth ||
          el.offsetHeight ||
          el.getClientRects().length
        );
      }

      function getCssPath(element) {
        if (!element || !element.tagName) return '';

        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 7) {
          let selector = current.tagName.toLowerCase();

          if (current.id) {
            selector += `#${current.id}`;
            parts.unshift(selector);
            break;
          }

          if (current.className && typeof current.className === 'string') {
            const classes = current.className
              .split(/\s+/)
              .filter(Boolean)
              .filter(c => !c.includes(':'))
              .slice(0, 2);

            if (classes.length) selector += `.${classes.join('.')}`;
          }

          const parent = current.parentElement;

          if (parent) {
            const siblings = Array.from(parent.children).filter(
              child => child.tagName === current.tagName
            );

            if (siblings.length > 1) {
              selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
            }
          }

          parts.unshift(selector);
          current = parent;
        }

        return parts.join(' > ');
      }

      function getRole(el) {
        if (!el) return '';
        if (el.getAttribute('role')) return el.getAttribute('role');

        const tag = el.tagName.toLowerCase();
        const type = el.getAttribute('type') || '';

        if (tag === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (tag === 'select') return 'combobox';
        if (tag === 'textarea') return 'textbox';

        if (tag === 'input') {
          if (['submit', 'button', 'reset'].includes(type)) return 'button';
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          return 'textbox';
        }

        return '';
      }

      function getLabelText(el) {
        if (!el) return '';

        const id = el.id;

        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label) return cleanText(label.innerText || label.textContent || '');
        }

        const parentLabel = el.closest('label');
        if (parentLabel) return cleanText(parentLabel.innerText || parentLabel.textContent || '');

        return '';
      }

      function getAccessibleName(el) {
        if (!el) return '';

        const tag = el.tagName.toLowerCase();

        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          return cleanText(
            el.getAttribute('aria-label') ||
            getLabelText(el) ||
            el.getAttribute('placeholder') ||
            el.getAttribute('name') ||
            el.id ||
            ''
          );
        }

        return cleanText(
          el.getAttribute('aria-label') ||
          getLabelText(el) ||
          el.innerText ||
          el.textContent ||
          el.getAttribute('placeholder') ||
          el.getAttribute('name') ||
          el.id ||
          ''
        );
      }

      function getElementInfo(el) {
        return {
          tag: el.tagName.toLowerCase(),
          role: getRole(el),
          text: cleanText(el.innerText || el.textContent || el.value || '').slice(0, 180),
          accessibleName: getAccessibleName(el).slice(0, 180),
          id: el.id || '',
          name: el.getAttribute('name') || '',
          type: el.getAttribute('type') || '',
          placeholder: el.getAttribute('placeholder') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          href: el.getAttribute('href') || '',
          value: el.getAttribute('value') || '',
          className: typeof el.className === 'string' ? el.className : '',
          css: getCssPath(el)
        };
      }

      function inferElementIntent(info) {
        const text = `${info.text} ${info.accessibleName} ${info.name} ${info.id} ${info.href} ${info.type} ${info.className}`.toLowerCase();

        if (info.role === 'textbox') {
          if (text.includes('email') || text.includes('correo')) return 'fill_email';
          if (text.includes('password') || text.includes('contraseña')) return 'fill_password';
          if (text.includes('nombre') || text.includes('name')) return 'fill_name';
          if (text.includes('tel') || text.includes('phone')) return 'fill_phone';
          if (text.includes('buscar') || text.includes('search')) return 'search';
          if (text.includes('cantidad') || info.type === 'number') return 'fill_number';
          return 'fill_text';
        }

        if (info.role === 'button' || info.tag === 'button') {
          if (text.includes('ingresar')) return 'enter_system';
          if (text.includes('salir') || text.includes('cerrar sesion') || text.includes('cerrar sesión')) return 'logout_or_exit';
          if (text.includes('guardar')) return 'save';
          if (text.includes('enviar')) return 'submit_form';
          if (text.includes('añadir al carrito') || text.includes('agregar al carrito') || text.includes('add-to-cart')) return 'ecommerce_add_to_cart';
          return 'click_button';
        }

        if (info.role === 'link' || info.tag === 'a') {
          return 'click_link';
        }

        return 'inspect_element';
      }

      function extractTable(table, index) {
        let headers = Array.from(table.querySelectorAll('thead th, thead td'))
          .map(th => cleanText(th.innerText || th.textContent || ''));

        if (!headers.length) {
          const firstRow = table.querySelector('tr');
          if (firstRow) {
            headers = Array.from(firstRow.querySelectorAll('th, td'))
              .map(cell => cleanText(cell.innerText || cell.textContent || ''));
          }
        }

        let bodyRows = Array.from(table.querySelectorAll('tbody tr'));

        if (!bodyRows.length) {
          bodyRows = Array.from(table.querySelectorAll('tr')).slice(headers.length ? 1 : 0);
        }

        const rows = bodyRows.slice(0, 100).map(tr => {
          return Array.from(tr.querySelectorAll('td, th')).map(td =>
            cleanText(td.innerText || td.textContent || '')
          );
        }).filter(row => row.some(Boolean));

        return {
          index,
          css: getCssPath(table),
          headers,
          rowCount: bodyRows.length,
          sampleRows: rows.slice(0, 20),
          rows
        };
      }

      function extractCards() {
        const selectors = [
          '.kpi-card',
          '.contact-card',
          '.stat-card',
          '.info-card',
          '.card',
          '[class*="card"]'
        ];

        const found = [];
        const seen = new Set();

        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((el) => {
            if (!isVisible(el)) return;

            const text = cleanText(el.innerText || el.textContent || '');

            if (!text || seen.has(text)) return;

            seen.add(text);

            found.push({
              selector,
              css: getCssPath(el),
              text: text.slice(0, 500)
            });
          });
        }

        return found;
      }

      function extractSections() {
        const candidates = Array.from(document.querySelectorAll(
          'main, section, nav, aside, header, footer, .page, .content-area, .sidebar, .topbar, [id^="page-"]'
        ));

        return candidates
          .filter(isVisible)
          .map(el => ({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: typeof el.className === 'string' ? el.className : '',
            css: getCssPath(el),
            textPreview: cleanText(el.innerText || el.textContent || '').slice(0, 800)
          }))
          .filter(item => item.textPreview);
      }

      function extractRoleTable(el, index) {
        const rowElements = Array.from(el.querySelectorAll('[role="row"]')).filter(isVisible);

        const roleRows = rowElements.map(row => {
          return Array.from(row.querySelectorAll('[role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"]'))
            .filter(isVisible)
            .map(cell => cleanText(cell.innerText || cell.textContent || ''));
        }).filter(row => row.some(Boolean));

        const headers = roleRows.length ? roleRows[0] : [];
        const rows = roleRows.slice(1);

        return {
          index,
          css: getCssPath(el),
          headers,
          rowCount: rows.length,
          sampleRows: rows.slice(0, 20),
          rows
        };
      }

      function extractDataBlocks() {
        const containers = Array.from(document.querySelectorAll(
          '[class*="table"], [class*="grid"], [class*="list"], [class*="pedido"], [class*="order"], [class*="row"], [class*="card"], section, main, .content-area'
        )).filter(isVisible);

        const blocks = [];
        const seen = new Set();

        containers.forEach((container, index) => {
          const children = Array.from(container.children).filter(isVisible);

          if (children.length < 2) return;

          const childTexts = children
            .map(child => cleanText(child.innerText || child.textContent || '', 300))
            .filter(t => t && t.length >= 5);

          if (childTexts.length < 2) return;

          const signature = childTexts.slice(0, 3).join('|');

          if (seen.has(signature)) return;
          seen.add(signature);

          blocks.push({
            index,
            css: getCssPath(container),
            title: cleanText(container.querySelector('h1,h2,h3,h4')?.innerText || '', 120),
            itemCount: childTexts.length,
            sampleItems: childTexts.slice(0, 20)
          });
        });

        return blocks.slice(0, 25);
      }

      const buttons = Array.from(document.querySelectorAll(
        'button, input[type="button"], input[type="submit"], [role="button"]'
      ))
        .filter(isVisible)
        .map(el => {
          const info = getElementInfo(el);
          return { ...info, intent: inferElementIntent(info) };
        });

      const links = Array.from(document.querySelectorAll('a, [role="link"]'))
        .filter(isVisible)
        .map(el => {
          const info = getElementInfo(el);
          return { ...info, intent: inferElementIntent(info) };
        });

      const fields = Array.from(document.querySelectorAll('input, textarea, select'))
        .filter(isVisible)
        .map(el => {
          const info = getElementInfo(el);
          return { ...info, intent: inferElementIntent(info) };
        });

      const visibleTables = Array.from(document.querySelectorAll('table'))
        .filter(isVisible)
        .map(extractTable);

      const allDomTables = Array.from(document.querySelectorAll('table'))
        .map((table, index) => ({
          ...extractTable(table, index),
          visible: isVisible(table),
          parentPageId: table.closest('[id^="page-"]')?.id || '',
          parentPageClass: table.closest('[id^="page-"]')?.className || ''
        }));

      const roleTables = Array.from(document.querySelectorAll('[role="table"], [role="grid"]'))
        .filter(isVisible)
        .map(extractRoleTable);

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .filter(isVisible)
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          text: cleanText(el.innerText || el.textContent || ''),
          css: getCssPath(el)
        }))
        .filter(item => item.text);

      const cards = extractCards();
      const dataBlocks = extractDataBlocks();

      return {
        reason,
        url: location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        language: document.documentElement.lang || '',
        visibleTextPreview: cleanText(document.body.innerText || '').slice(0, 1200),
        counts: {
          buttons: buttons.length,
          links: links.length,
          fields: fields.length,
          tables: visibleTables.length,
          allDomTables: allDomTables.length,
          roleTables: roleTables.length,
          dataBlocks: dataBlocks.length,
          cards: cards.length,
          headings: headings.length
        },
        headings,
        buttons,
        links,
        fields,
        tables: visibleTables,
        allDomTables,
        roleTables,
        dataBlocks,
        cards,
        sections: extractSections()
      };
    }, reason);

    const alreadyExists = pageSnapshots.some(
      s => s.url === snapshot.url && s.reason === snapshot.reason
    );

    if (!alreadyExists) {
      pageSnapshots.push(snapshot);

      const mapItem = {
        url: snapshot.url,
        title: snapshot.title,
        timestamp: snapshot.timestamp,
        counts: snapshot.counts,
        mainHeadings: snapshot.headings.slice(0, 5).map(h => h.text)
      };

      siteMap.push(mapItem);

      console.log(`[PAGE INSPECTED] ${snapshot.title} | ${snapshot.url}`);
      console.log(
        `  botones=${snapshot.counts.buttons}, links=${snapshot.counts.links}, campos=${snapshot.counts.fields}, tablas=${snapshot.counts.tables}, allDomTables=${snapshot.counts.allDomTables}`
      );
    }

    return snapshot;
  } catch (error) {
    console.log(`[INSPECT ERROR] ${error.message}`);
    return null;
  }
}

function tableToObjects(table) {
  const headers = table.headers || [];
  const rows = table.rows || table.sampleRows || [];

  if (!headers.length || !rows.length) {
    return rows.map((row, index) => ({
      rowIndex: index,
      values: row
    }));
  }

  return rows.map((row, rowIndex) => {
    const obj = { rowIndex };

    headers.forEach((header, i) => {
      const key = normalizeKey(header) || `column_${i + 1}`;
      obj[key] = row[i] ?? '';
    });

    return obj;
  });
}

function extractBusinessData() {
  const tables = [];

  for (const snapshot of pageSnapshots) {
    const visibleTables = snapshot.tables || [];
    const domTables = snapshot.allDomTables || [];

    for (const table of visibleTables) {
      tables.push({
        source: snapshot.reason,
        url: snapshot.url,
        title: snapshot.title,
        visible: true,
        parentPageId: table.parentPageId || '',
        headers: table.headers || [],
        rowCount: table.rowCount || 0,
        rows: tableToObjects(table)
      });
    }

    for (const table of domTables) {
      const alreadyVisible = visibleTables.some(v => v.css === table.css);

      if (alreadyVisible) continue;

      tables.push({
        source: snapshot.reason,
        url: snapshot.url,
        title: snapshot.title,
        visible: !!table.visible,
        parentPageId: table.parentPageId || '',
        parentPageClass: table.parentPageClass || '',
        headers: table.headers || [],
        rowCount: table.rowCount || 0,
        rows: tableToObjects(table)
      });
    }
  }

  const suppliers = {};

  for (const table of tables) {
    for (const row of table.rows || []) {
      const proveedor =
        row.proveedor ||
        row.supplier ||
        row.vendor ||
        row.empresa ||
        '';

      if (!proveedor) continue;

      if (!suppliers[proveedor]) {
        suppliers[proveedor] = {
          name: proveedor,
          rowCount: 0,
          totalAmount: 0,
          totalUnits: 0,
          products: [],
          clients: [],
          rows: []
        };
      }

      const amount =
        parseMoney(row.monto) ??
        parseMoney(row.precio_final) ??
        parseMoney(row.total) ??
        0;

      const units = Number(String(row.unidades || row.units || '').replace(/[^0-9.-]/g, ''));

      suppliers[proveedor].rowCount += 1;
      suppliers[proveedor].totalAmount += amount || 0;
      suppliers[proveedor].totalUnits += Number.isFinite(units) ? units : 0;

      const client = row.cliente || row.client || '';
      if (client && !suppliers[proveedor].clients.includes(client)) {
        suppliers[proveedor].clients.push(client);
      }

      const product = row.producto || row.product || '';
      const sku = row.sku || '';

      if (product || sku) {
        suppliers[proveedor].products.push({
          product,
          sku,
          date: row.fecha_del_pedido || row.fecha || row.date || '',
          units: row.unidades || row.units || '',
          unitPrice: row.precio_unitario || row.unit_price || '',
          finalPrice: row.precio_final || row.final_price || row.monto || ''
        });
      }

      suppliers[proveedor].rows.push({
        source: table.source,
        visible: table.visible,
        data: row
      });
    }
  }

  return {
    tables,
    suppliers: Object.values(suppliers)
  };
}

async function saveReplayJson() {
  const output = {
    app: 'MapOnce AI Smart Replay',
    version: '0.4.0',
    createdAt: now(),
    replayOf: {
      app: recording.app || '',
      version: recording.version || '',
      createdAt: recording.createdAt || '',
      file: filePath,
      totalEvents: recording.totalEvents || recording.events?.length || 0
    },
    totalEvents: events.length,
    totalSnapshots: pageSnapshots.length,
    totalErrors: replayErrors.length,
    siteMap,
    pageSnapshots,
    events,
    replayErrors,
    extractedBusinessData: extractBusinessData()
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n======================================');
  console.log('Replay guardado');
  console.log(`Archivo: ${outputPath}`);
  console.log(`Eventos ejecutados: ${events.length}`);
  console.log(`Snapshots guardados: ${pageSnapshots.length}`);
  console.log('======================================\n');

  return output;
}

async function recordReplayEvent(sourceEvent, success, message = '', page = null) {
  const event = {
    type: sourceEvent.type,
    intent: sourceEvent.intent || '',
    url: sourceEvent.url || '',
    timestamp: now(),
    replay: {
      success,
      message,
      sourceTimestamp: sourceEvent.timestamp || '',
      urlAfter: page ? page.url() : ''
    },
    value: sourceEvent.value ?? '',
    tag: sourceEvent.tag || '',
    text: sourceEvent.text || '',
    accessibleName: sourceEvent.accessibleName || '',
    labelText: sourceEvent.labelText || '',
    id: sourceEvent.id || '',
    name: sourceEvent.name || '',
    role: sourceEvent.role || '',
    placeholder: sourceEvent.placeholder || '',
    ariaLabel: sourceEvent.ariaLabel || '',
    href: sourceEvent.href || '',
    typeAttr: sourceEvent.typeAttr || '',
    valueAttr: sourceEvent.valueAttr || '',
    className: sourceEvent.className || '',
    dataProductId: sourceEvent.dataProductId || '',
    formAction: sourceEvent.formAction || '',
    formMethod: sourceEvent.formMethod || '',
    nearbyText: sourceEvent.nearbyText || '',
    css: sourceEvent.css || '',
    selectorCandidates: sourceEvent.selectorCandidates || []
  };

  events.push(event);

  return event;
}

async function main() {
  console.log('======================================');
  console.log('MapOnce AI - Smart Universal Replay');
  console.log('======================================');
  console.log(`Archivo: ${filePath}`);
  console.log(`Eventos: ${recording.events.length}`);
  console.log(`Salida JSON: ${outputPath}`);
  console.log('======================================');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 250
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  page.setDefaultTimeout(8000);

  for (const [index, event] of recording.events.entries()) {
    try {
      if (event.url && isNoiseUrl(event.url)) {
        console.log(`[SKIP NOISE URL] ${event.url}`);
        await recordReplayEvent(event, true, 'skip_noise_url', page);
        continue;
      }

      if (event.type === 'goto') {
        console.log(`[GOTO] ${event.url}`);
        await page.goto(event.url, { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await hideNoise(page);
        await recordReplayEvent(event, true, 'goto_ok', page);
        await inspectCurrentPage(page, 'initial_load');
        continue;
      }

      if (event.type === 'navigation') {
        const currentUrl = page.url();

        if (event.url && !isNoiseUrl(event.url) && currentUrl !== event.url) {
          console.log(`[NAVIGATE] ${event.url}`);
          await page.goto(event.url, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
          await hideNoise(page);
          await recordReplayEvent(event, true, 'navigation_ok', page);
        } else {
          console.log(`[SKIP NAVIGATION EVENT] ${event.url}`);
          await recordReplayEvent(event, true, 'navigation_skipped', page);
        }

        await inspectCurrentPage(page, 'navigation');
        continue;
      }

      if (event.type === 'modal_detected') {
        console.log(`[MODAL] ${event.modalTitle || 'Modal detectado'}`);
        await waitForPossibleModal(page);
        await recordReplayEvent(event, true, 'modal_checked', page);
        await inspectCurrentPage(page, 'after_modal_detected');
        continue;
      }

      if (event.type === 'click') {
        const ok = await smartClick(page, event);
        await recordReplayEvent(event, ok, ok ? 'click_ok' : 'click_failed', page);

        if (ok) {
          await inspectCurrentPage(page, `after_${event.intent || 'click'}`);
        }

        continue;
      }

      if (event.type === 'fill') {
        const ok = await smartFill(page, event);
        await recordReplayEvent(event, ok, ok ? 'fill_ok' : 'fill_failed', page);
        continue;
      }

      if (event.type === 'select') {
        const ok = await smartSelect(page, event);
        await recordReplayEvent(event, ok, ok ? 'select_ok' : 'select_failed', page);
        continue;
      }

      if (event.type === 'check') {
        const ok = await smartCheck(page, event);
        await recordReplayEvent(event, ok, ok ? 'check_ok' : 'check_failed', page);
        continue;
      }

      if (event.type === 'submit') {
        console.log(`[SUBMIT] ${event.intent}`);

        const clicked = await smartClick(page, event);

        if (!clicked && event.formAction) {
          console.log(`[SUBMIT FALLBACK NAVIGATE] ${event.formAction}`);
          await page.goto(event.formAction, { waitUntil: 'domcontentloaded' });
          await waitForPageReady(page);
        }

        const ok = clicked || !!event.formAction;
        await recordReplayEvent(event, ok, ok ? 'submit_ok' : 'submit_failed', page);
        await inspectCurrentPage(page, `after_${event.intent || 'submit'}`);
        continue;
      }

      await recordReplayEvent(event, true, 'event_type_skipped', page);

    } catch (error) {
      console.log(`[ERROR EVENT] ${event.type} ${event.intent}`);
      console.log(error.message.split('\n')[0]);

      replayErrors.push({
        index,
        type: event.type,
        intent: event.intent || '',
        message: error.message.split('\n')[0],
        timestamp: now()
      });

      await recordReplayEvent(event, false, error.message.split('\n')[0], page);
    }
  }

  await inspectCurrentPage(page, 'final_state');

  await saveReplayJson();

  console.log('======================================');
  console.log('Replay terminado');
  console.log('======================================');

  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(error => {
  console.error('Error en replay:', error);
  process.exit(1);
});