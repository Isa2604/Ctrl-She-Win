const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const recordingsDir = path.join(__dirname, 'recordings');

if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const sessionId = Date.now();

const events = [];
const pageSnapshots = [];
const siteMap = [];

function now() {
  return new Date().toISOString();
}

function cleanText(text = '') {
  return String(text)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function cssEscapeIdentifier(value = '') {
  return String(value).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
}

function cssEscape(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function regexEscape(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function isUselessClick(event) {
  if (!event || event.type !== 'click') return false;

  const hasUsefulTarget =
    event.text ||
    event.accessibleName ||
    event.placeholder ||
    event.name ||
    event.id ||
    event.href ||
    event.ariaLabel ||
    event.dataProductId;

  const isClickableRole =
    event.role === 'button' ||
    event.role === 'link' ||
    event.role === 'checkbox' ||
    event.role === 'radio';

  const isNaturallyClickable =
    event.tag === 'button' ||
    event.tag === 'a' ||
    event.tag === 'input' ||
    event.tag === 'select' ||
    event.tag === 'textarea';

  if (!hasUsefulTarget && !isClickableRole && !isNaturallyClickable) {
    return true;
  }

  const uselessTags = ['div', 'span', 'i', 'svg', 'path', 'section'];

  if (!hasUsefulTarget && uselessTags.includes(event.tag)) {
    return true;
  }

  return false;
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

function isSensitiveField(event) {
  const text = `${event.text || ''} ${event.placeholder || ''} ${event.name || ''} ${event.id || ''} ${event.typeAttr || ''}`.toLowerCase();

  return (
    text.includes('password') ||
    text.includes('contraseña') ||
    text.includes('pass') ||
    event.typeAttr === 'password'
  );
}

function maskValueIfNeeded(event) {
  if (event.type !== 'fill') return event;

  if (isSensitiveField(event)) {
    return {
      ...event,
      value: '__PASSWORD_NOT_STORED__',
      valueStored: false,
      sensitive: true
    };
  }

  return {
    ...event,
    valueStored: true,
    sensitive: false
  };
}

function inferIntent(event) {
  const text = `${event.text || ''} ${event.placeholder || ''} ${event.name || ''} ${event.id || ''} ${event.href || ''} ${event.typeAttr || ''} ${event.className || ''} ${event.valueAttr || ''} ${event.formAction || ''}`.toLowerCase();

  if (event.type === 'goto') return 'open_url';
  if (event.type === 'navigation') return 'navigate';

  if (event.type === 'fill') {
    if (text.includes('email') || text.includes('correo')) return 'fill_email';
    if (text.includes('password') || text.includes('contraseña') || text.includes('pass')) return 'fill_password';
    if (text.includes('search') || text.includes('buscar')) return 'search';
    if (text.includes('name') || text.includes('nombre')) return 'fill_name';
    if (text.includes('phone') || text.includes('teléfono') || text.includes('telefono') || text.includes('tel')) return 'fill_phone';
    if (text.includes('address') || text.includes('dirección') || text.includes('direccion')) return 'fill_address';
    if (text.includes('date') || text.includes('fecha')) return 'fill_date';
    if (text.includes('amount') || text.includes('cantidad') || text.includes('monto') || event.typeAttr === 'number') return 'fill_number';
    return 'fill_text';
  }

  if (event.type === 'select') return 'select_option';
  if (event.type === 'check') return 'check_option';

  if (event.type === 'click' || event.type === 'submit') {
    if (
      text.includes('añadir al carrito') ||
      text.includes('agregar al carrito') ||
      text.includes('add to cart') ||
      text.includes('add-to-cart') ||
      text.includes('single_add_to_cart') ||
      text.includes('single_add_to_cart_button') ||
      text.includes('carrito') ||
      event.name === 'add-to-cart'
    ) {
      return 'ecommerce_add_to_cart';
    }

    if (text.includes('checkout') || text.includes('finalizar compra')) return 'ecommerce_checkout';

    if (text.includes('login') || text.includes('sign in') || text.includes('iniciar sesión') || text.includes('iniciar sesion')) return 'login';
    if (text.includes('signup') || text.includes('sign up') || text.includes('register') || text.includes('registrar')) return 'register';
    if (text.includes('search') || text.includes('buscar')) return 'submit_search';
    if (text.includes('submit') || text.includes('send') || text.includes('enviar')) return 'submit_form';
    if (text.includes('save') || text.includes('guardar')) return 'save';
    if (text.includes('cancel') || text.includes('cancelar')) return 'cancel';
    if (text.includes('continue') || text.includes('continuar') || text.includes('siguiente')) return 'continue';
    if (text.includes('download') || text.includes('descargar')) return 'download_file';
    if (text.includes('upload') || text.includes('subir') || text.includes('cargar')) return 'upload_file';
    if (text.includes('delete') || text.includes('eliminar') || text.includes('borrar')) return 'delete';
    if (text.includes('edit') || text.includes('editar')) return 'edit';
    if (text.includes('view') || text.includes('ver') || text.includes('details') || text.includes('detalle')) return 'view_details';

    if (event.role === 'link') return 'click_link';
    if (event.role === 'button') return 'click_button';

    return 'click_element';
  }

  return 'unknown';
}

function buildSelectorCandidates(meta) {
  const candidates = [];

  if (meta.testId) {
    candidates.push({
      strategy: 'testid',
      selector: `[data-testid="${cssEscape(meta.testId)}"]`,
      score: 100
    });
  }

  if (meta.id) {
  candidates.push({
    strategy: 'id',
    selector: `#${cssEscapeIdentifier(meta.id)}`,
    raw: meta.id,
    score: 96
  });

  if (meta.name && meta.valueAttr) {
    candidates.push({
      strategy: 'name_value',
      selector: `[name="${cssEscape(meta.name)}"][value="${cssEscape(meta.valueAttr)}"]`,
      score: 98
    });
  }

  if (meta.className && meta.className.includes('single_add_to_cart_button')) {
    candidates.push({
      strategy: 'woocommerce_add_to_cart',
      selector: 'button.single_add_to_cart_button',
      score: 97
    });
  }
}

  if (meta.name) {
    candidates.push({
      strategy: 'name',
      selector: `[name="${cssEscape(meta.name)}"]`,
      score: 92
    });
  }

  if (meta.placeholder) {
    candidates.push({
      strategy: 'placeholder',
      selector: meta.placeholder,
      score: 90
    });
  }

  if (meta.role && meta.accessibleName) {
    candidates.push({
      strategy: 'role_name',
      role: meta.role,
      name: meta.accessibleName,
      score: 88
    });
  }

  if (meta.role && meta.text) {
    candidates.push({
      strategy: 'role_name',
      role: meta.role,
      name: meta.text,
      score: 86
    });
  }

  if (meta.ariaLabel) {
    candidates.push({
      strategy: 'aria_label',
      selector: `[aria-label="${cssEscape(meta.ariaLabel)}"]`,
      score: 85
    });
  }

  if (meta.href && meta.tag === 'a') {
    candidates.push({
      strategy: 'href',
      selector: `a[href="${cssEscape(meta.href)}"]`,
      score: 82
    });
  }

  if (meta.dataProductId) {
    candidates.push({
      strategy: 'data_product_id',
      selector: `[data-product-id="${cssEscape(meta.dataProductId)}"]`,
      score: 80
    });
  }

  if (meta.typeAttr && meta.tag === 'input') {
    candidates.push({
      strategy: 'input_type',
      selector: `input[type="${cssEscape(meta.typeAttr)}"]`,
      score: 76
    });
  }

  if (meta.text) {
    candidates.push({
      strategy: 'text',
      selector: meta.text,
      score: 70
    });
  }

  if (meta.css && !isNoiseSelector(meta.css)) {
    candidates.push({
      strategy: 'css_fallback',
      selector: meta.css,
      score: 40
    });
  }

  return candidates;
}

async function getElementMetadata(page, elementHandle) {
  return await page.evaluate((el) => {
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

          if (classes.length) {
            selector += `.${classes.join('.')}`;
          }
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

    function getRole(element) {
      if (element.getAttribute('role')) return element.getAttribute('role');

      const tag = element.tagName.toLowerCase();
      const type = element.getAttribute('type');

      if (tag === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (tag === 'select') return 'combobox';
      if (tag === 'textarea') return 'textbox';

      if (tag === 'input') {
        if (['submit', 'button', 'reset'].includes(type)) return 'button';
        if (['checkbox'].includes(type)) return 'checkbox';
        if (['radio'].includes(type)) return 'radio';
        return 'textbox';
      }

      return '';
    }

    function getLabelText(element) {
      if (!element) return '';

      const id = element.id;

      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) return label.innerText || label.textContent || '';
      }

      const parentLabel = element.closest('label');
      if (parentLabel) return parentLabel.innerText || parentLabel.textContent || '';

      return '';
    }

    function getAccessibleName(element) {
      const tag = element.tagName.toLowerCase();

      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return (
          element.getAttribute('aria-label') ||
          getLabelText(element) ||
          element.getAttribute('placeholder') ||
          element.getAttribute('name') ||
          element.id ||
          ''
        );
      }

      return (
        element.getAttribute('aria-label') ||
        getLabelText(element) ||
        element.innerText ||
        element.textContent ||
        element.getAttribute('placeholder') ||
        element.getAttribute('name') ||
        element.id ||
        ''
      );
    }

    function getNearbyText(element) {
      const parent = element.closest('form, div, section, article, li, tr, main') || element.parentElement;

      if (!parent) return '';

      return (parent.innerText || parent.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400);
    }

    return {
      tag: el.tagName.toLowerCase(),
      text: el.innerText || el.textContent || el.value || '',
      accessibleName: getAccessibleName(el),
      labelText: getLabelText(el),
      id: el.id || '',
      name: el.getAttribute('name') || '',
      typeAttr: el.getAttribute('type') || '',
      placeholder: el.getAttribute('placeholder') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      role: getRole(el),
      href: el.getAttribute('href') || '',
      testId: el.getAttribute('data-testid') || '',
      dataProductId: el.getAttribute('data-product-id') || '',
      css: getCssPath(el),
      nearbyText: getNearbyText(el),
      isVisible: !!(
        el.offsetWidth ||
        el.offsetHeight ||
        el.getClientRects().length
      )
    };
  }, elementHandle);
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
          if (text.includes('salir')) return 'logout_or_exit';
          if (text.includes('guardar')) return 'save';
          if (text.includes('enviar')) return 'submit_form';
          if (text.includes('añadir al carrito') || text.includes('add-to-cart')) return 'ecommerce_add_to_cart';
          return 'click_button';
        }

        if (info.role === 'link' || info.tag === 'a') {
          return 'click_link';
        }

        return 'inspect_element';
      }

      function extractTable(table, index) {
        const headers = Array.from(table.querySelectorAll('thead th'))
          .map(th => cleanText(th.innerText || th.textContent || ''));

        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20).map(tr => {
          return Array.from(tr.querySelectorAll('td')).map(td =>
            cleanText(td.innerText || td.textContent || '')
          );
        });

        return {
          index,
          css: getCssPath(table),
          headers,
          rowCount: table.querySelectorAll('tbody tr').length,
          sampleRows: rows
        };
      }

      function extractCards() {
        const selectors = [
          '.kpi-card',
          '.contact-card',
          '.card',
          '[class*="card"]'
        ];

        const found = [];

        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((el) => {
            if (!isVisible(el)) return;

            const text = cleanText(el.innerText || el.textContent || '');

            if (!text) return;

            found.push({
              selector,
              css: getCssPath(el),
              text: text.slice(0, 250)
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
            textPreview: cleanText(el.innerText || el.textContent || '').slice(0, 250)
          }))
          .filter(item => item.textPreview);
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

      const tables = Array.from(document.querySelectorAll('table'))
        .filter(isVisible)
        .map(extractTable);

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .filter(isVisible)
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          text: cleanText(el.innerText || el.textContent || ''),
          css: getCssPath(el)
        }))
        .filter(item => item.text);

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

      return {
        reason,
        url: location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        visibleTextPreview: cleanText(document.body.innerText || '').slice(0, 1200),
        counts: {
          buttons: buttons.length,
          links: links.length,
          fields: fields.length,
          tables: visibleTables.length,
          allDomTables: allDomTables.length,
          headings: headings.length
        },
        tables: visibleTables,
        allDomTables,
        headings,
        buttons,
        links,
        fields,
        cards: extractCards(),
        sections: extractSections()
      };
    }, reason);

    const alreadyExists = pageSnapshots.some(s => s.url === snapshot.url && s.reason === snapshot.reason);
    
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
      console.log(`  botones=${snapshot.counts.buttons}, links=${snapshot.counts.links}, campos=${snapshot.counts.fields}, tablas=${snapshot.counts.tables}`);
    }

    return snapshot;
  } catch (error) {
    console.log(`[INSPECT ERROR] ${error.message}`);
    return null;
  }
}

async function saveRecording() {
  const cleanedEvents = events.map(maskValueIfNeeded);

  const output = {
    app: 'MapOnce AI Smart Recorder',
    version: '0.3.0',
    createdAt: now(),
    totalEvents: cleanedEvents.length,
    totalSnapshots: pageSnapshots.length,
    siteMap,
    pageSnapshots,
    events: cleanedEvents
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n======================================');
  console.log('Grabación guardada');
  console.log(`Archivo: ${outputPath}`);
  console.log(`Eventos guardados: ${cleanedEvents.length}`);
  console.log('======================================\n');
}

async function injectRecorder(page) {
  await page.addInitScript(() => {
    window.__mapOnceQueue = [];

    function getBasicCssPath(element) {
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

    function cleanTextBrowser(text = '') {
      return String(text).replace(/\s+/g, ' ').trim().slice(0, 300);
    }

    function isVisible(element) {
      if (!element) return false;

      const style = window.getComputedStyle(element);

      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return false;
      }

      return !!(
        element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
      );
    }

    function getElementSnapshot(el) {
      if (!el) return {};

      function getRole(element) {
        if (element.getAttribute('role')) return element.getAttribute('role');

        const tag = element.tagName.toLowerCase();
        const type = element.getAttribute('type') || '';

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

      return {
        tag: el.tagName?.toLowerCase() || '',
        text: cleanTextBrowser(el.innerText || el.textContent || el.value || ''),
        id: el.id || '',
        name: el.getAttribute('name') || '',
        valueAttr: el.getAttribute('value') || '',
        typeAttr: el.getAttribute('type') || '',
        placeholder: el.getAttribute('placeholder') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        role: getRole(el),
        href: el.getAttribute('href') || '',
        className: typeof el.className === 'string' ? el.className : '',
        dataProductId: el.getAttribute('data-product-id') || '',
        formAction: el.form?.getAttribute('action') || el.form?.action || '',
        formMethod: el.form?.getAttribute('method') || el.form?.method || '',
        css: getBasicCssPath(el)
      };
    }

    function pushEvent(event) {
      window.__mapOnceQueue.push({
        ...event,
        time: new Date().toISOString()
      });
    }

    function detectModal(element) {
      if (!element || !element.querySelector) return null;

      const modal =
        element.matches?.('.modal, .modal-dialog, [role="dialog"], .modal-content')
          ? element
          : element.querySelector('.modal, .modal-dialog, [role="dialog"], .modal-content');

      if (!modal) return null;
      if (!isVisible(modal)) return null;

      const text = cleanTextBrowser(modal.innerText || modal.textContent || '');

      if (!text) return null;

      return {
        type: 'modal_detected',
        css: getBasicCssPath(modal),
        value: '',
        modalText: text,
        modalTitle:
          cleanTextBrowser(
            modal.querySelector('.modal-title, h1, h2, h3, h4')?.innerText ||
            modal.querySelector('.modal-title, h1, h2, h3, h4')?.textContent ||
            ''
          ),
        buttons: Array.from(modal.querySelectorAll('button, a'))
          .filter(isVisible)
          .map(el => ({
            text: cleanTextBrowser(el.innerText || el.textContent || el.value || ''),
            href: el.getAttribute('href') || '',
            css: getBasicCssPath(el),
            tag: el.tagName.toLowerCase()
          }))
          .filter(item => item.text || item.href)
      };
    }

    let lastModalSignature = '';

    function scanForModal(root = document) {
      const modalEvent = detectModal(root);

      if (!modalEvent) return;

      const signature = `${modalEvent.modalTitle}|${modalEvent.modalText}`;

      if (signature === lastModalSignature) return;

      lastModalSignature = signature;
      pushEvent(modalEvent);
    }

    document.addEventListener(
      'click',
      event => {
        let target = event.target;

        if (!target) return;

        // Si se hizo click en un icono/span dentro de un botón o link,
        // subimos al elemento realmente accionable.
        const actionable = target.closest?.('button, a, input[type="submit"], input[type="button"], [role="button"], [role="link"]');

        if (actionable) {
          target = actionable;
        }

        pushEvent({
          type: 'click',
          css: getBasicCssPath(target),
          value: '',
          snapshot: getElementSnapshot(target)
        });

        setTimeout(() => scanForModal(document), 300);
        setTimeout(() => scanForModal(document), 800);
      },
      true
    );

    document.addEventListener(
      'submit',
      event => {
        const form = event.target;
        const submitter = event.submitter;

        pushEvent({
          type: 'submit',
          css: getBasicCssPath(submitter || form),
          value: '',
          snapshot: getElementSnapshot(submitter || form),
          formAction: form.getAttribute('action') || form.action || '',
          formMethod: form.getAttribute('method') || form.method || ''
        });
      },
      true
    );

    document.addEventListener(
      'input',
      event => {
        const target = event.target;

        if (!target) return;

        const tag = target.tagName.toLowerCase();
        const type = target.getAttribute('type') || '';

        if (!['input', 'textarea'].includes(tag)) return;
        if (['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(type)) return;

        pushEvent({
          type: 'fill',
          css: getBasicCssPath(target),
          value: target.value
        });
      },
      true
    );

    document.addEventListener(
      'change',
      event => {
        const target = event.target;

        if (!target) return;

        const tag = target.tagName.toLowerCase();
        const type = target.getAttribute('type') || '';

        if (tag === 'select') {
          pushEvent({
            type: 'select',
            css: getBasicCssPath(target),
            value: target.value
          });
          return;
        }

        if (tag === 'input' && ['checkbox', 'radio'].includes(type)) {
          pushEvent({
            type: 'check',
            css: getBasicCssPath(target),
            value: target.checked
          });
          return;
        }

        if (tag === 'input' || tag === 'textarea') {
          if (!['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(type)) {
            pushEvent({
              type: 'fill',
              css: getBasicCssPath(target),
              value: target.value
            });
          }
        }
      },
      true
    );

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            setTimeout(() => scanForModal(node), 100);
            setTimeout(() => scanForModal(document), 500);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden']
    });

    setInterval(() => scanForModal(document), 1000);
  });
}

function shouldSkipEvent(event) {
  if (!event) return true;
  if (isNoiseSelector(event.css)) return true;
  return false;
}

function isDuplicate(previous, event) {
  if (!previous || !event) return false;

  return (
    previous.type === event.type &&
    previous.url === event.url &&
    previous.css === event.css &&
    previous.value === event.value
  );
}

async function processRawEvent(page, rawEvent) {
  if (shouldSkipEvent(rawEvent)) return null;
  if (isNoiseUrl(page.url())) return null;

  if (rawEvent.type === 'modal_detected') {
    return {
      type: 'modal_detected',
      intent: 'modal_detected',
      url: page.url(),
      timestamp: rawEvent.time || now(),
      modalTitle: cleanText(rawEvent.modalTitle || ''),
      modalText: cleanText(rawEvent.modalText || ''),
      buttons: rawEvent.buttons || [],
      css: rawEvent.css || ''
    };
  }

  if (rawEvent.snapshot) {
    const snap = rawEvent.snapshot;

    let event = {
      type: rawEvent.type,
      url: page.url(),
      timestamp: rawEvent.time || now(),
      value: rawEvent.value || '',
      tag: snap.tag || '',
      text: cleanText(snap.text || ''),
      accessibleName: cleanText(snap.ariaLabel || snap.text || snap.name || snap.id || ''),
      labelText: '',
      id: snap.id || '',
      name: snap.name || '',
      role: snap.role || '',
      placeholder: snap.placeholder || '',
      ariaLabel: snap.ariaLabel || '',
      href: snap.href || '',
      typeAttr: snap.typeAttr || '',
      valueAttr: snap.valueAttr || '',
      className: snap.className || '',
      dataProductId: snap.dataProductId || '',
      formAction: rawEvent.formAction || snap.formAction || '',
      formMethod: rawEvent.formMethod || snap.formMethod || '',
      nearbyText: '',
      css: snap.css || rawEvent.css || ''
    };

    event.intent = inferIntent(event);
    event.selectorCandidates = buildSelectorCandidates(event);
    event = maskValueIfNeeded(event);

    if (isUselessClick(event)) {
      return null;
    }

    return event;
  }

  const handle = await page.$(rawEvent.css);
  if (!handle) return null;

  const meta = await getElementMetadata(page, handle);

  if (!meta.isVisible) return null;
  if (isNoiseSelector(meta.css)) return null;

  let event = {
    type: rawEvent.type,
    url: page.url(),
    timestamp: rawEvent.time || now(),
    value: rawEvent.value,
    tag: meta.tag,
    text: cleanText(meta.text),
    accessibleName: cleanText(meta.accessibleName),
    labelText: cleanText(meta.labelText),
    id: meta.id,
    name: meta.name,
    role: meta.role,
    placeholder: meta.placeholder,
    ariaLabel: meta.ariaLabel,
    href: meta.href,
    typeAttr: meta.typeAttr,
    dataProductId: meta.dataProductId,
    nearbyText: cleanText(meta.nearbyText),
    css: meta.css
  };

  event.intent = inferIntent(event);
  event.selectorCandidates = buildSelectorCandidates(event);
  event = maskValueIfNeeded(event);

  if (isUselessClick(event)) {
    return null;
}

return event;
}

async function main() {
  console.log('======================================');
  console.log('MapOnce AI - Smart Universal Recorder');
  console.log('======================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
  }

  const automatizationNameInput = await ask('Nombre de la automatización: ');

  const automatizationName = automatizationNameInput
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_') || `session_${sessionId}`;

  outputPath = path.join(recordingsDir, `smart_session_${automatizationName}.json`);
  
  const startUrl = await ask('URL inicial: ');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  page.setDefaultTimeout(8000);

  await injectRecorder(page);

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

  await page.waitForTimeout(800);
  await inspectCurrentPage(page, 'initial_load');

  events.push({
    type: 'goto',
    intent: 'open_url',
    url: page.url(),
    timestamp: now()
  });

  console.log('\nGrabando...');
  console.log('Comandos disponibles:');
  console.log('- salir / q / exit  = terminar y guardar');
  console.log('- save              = guardar sin terminar');
  console.log('\n');

  page.on('framenavigated', async frame => {
    if (frame !== page.mainFrame()) return;

    const url = frame.url();

    if (isNoiseUrl(url)) {
      console.log(`[SKIP NAVIGATION] ${url}`);
      return;
    }

    const previous = events[events.length - 1];

    if (!previous || previous.url !== url) {
      const event = {
        type: 'navigation',
        intent: 'navigate',
        url,
        timestamp: now()
      };

      events.push(event);
      console.log(`[NAVIGATION] ${url}`);

      setTimeout(async () => {
        await inspectCurrentPage(page, 'navigation');
      }, 1000);
    }
  });

  const interval = setInterval(async () => {
    try {
      if (page.isClosed()) return;

      const rawEvents = await page.evaluate(() => {
        const queue = window.__mapOnceQueue || [];
        window.__mapOnceQueue = [];
        return queue;
      });

      for (const rawEvent of rawEvents) {
        const event = await processRawEvent(page, rawEvent);

        if (!event) continue;

        const previous = events[events.length - 1];

        if (isDuplicate(previous, event)) continue;

        events.push(event);

        const label =
          event.accessibleName ||
          event.text ||
          event.placeholder ||
          event.name ||
          event.id ||
          event.css;

        console.log(`[${event.type.toUpperCase()}] intent=${event.intent} target="${label}"`);

        if (
          event.type === 'click' ||
          event.type === 'submit' ||
          event.type === 'modal_detected'
        ) {
          setTimeout(async () => {
            await inspectCurrentPage(page, `after_${event.intent}`);
          }, 800);
        }
      }
    } catch (error) {
      // No matar el recorder si cambia la página mientras leemos.
    }
  }, 350);

  async function finish() {
    clearInterval(interval);
    await saveRecording();
    await browser.close();
    rl.close();
    process.exit(0);
  }

  rl.on('line', async input => {
    const command = input.trim().toLowerCase();

    if (['salir', 'q', 'exit'].includes(command)) {
      await finish();
    }

    if (command === 'inspect') {
      await inspectCurrentPage(page, 'manual_command');
    }

    if (command === 'save') {
      await saveRecording();
    }
  });

  process.on('SIGINT', async () => {
    await finish();
  });
}

main().catch(error => {
  console.error('Error en recorder:', error);
  process.exit(1);
});