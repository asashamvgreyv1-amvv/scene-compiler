// In-browser UI test for every builder filter. Load it on the running app and call runUITests().
// Exercises each picker in every way it can be used: open, pick, type your own, Enter, clear item,
// field ✕, popover ✕, Escape, outside tap, multi-select add/remove, face tiles, skin swatches, age controls.
(function () {
  const wait = () => Promise.resolve(); // builder updates synchronously; no timers needed
  const $ = (s, root) => (root || document).querySelector(s);
  const $$ = (s, root) => [...(root || document).querySelectorAll(s)];
  const pop = () => $('.pop');
  // "open" means actually visible on screen, not merely the hidden flag
  const isOpen = () => { const p = pop(); const cs = getComputedStyle(p); return cs.display !== 'none' && cs.visibility !== 'hidden' && p.getBoundingClientRect().height > 0; };
  // after closing, nothing invisible may sit on top of the page and swallow taps
  const blocksTaps = (el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return hit && pop().contains(hit); };
  // real-ish input: pointerdown → mousedown → pointerup → mouseup → click, like a finger or mouse
  let POINTER = 'mouse';
  function tap(el) {
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: POINTER };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }
  function key(el, k) { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function type(el, text) { el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); }

  window.runUITests = async function (pointer) {
    POINTER = pointer || 'mouse';
    const fails = [];
    let checks = 0;
    const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };
    const field = (box, k) => $(`${box} .pk-b[data-k="${k}"]`);
    const valueOf = (box, k) => (field(box, k) ? field(box, k).textContent.trim() : null);

    // fresh state with one woman and one man
    $('#resetBtn') && tap($('#resetBtn'));
    await wait(150);
    $$('details.builder').forEach((d) => (d.open = true));
    tap($('[data-add=f][data-d="1"]')); await wait(80);
    tap($('[data-add=m][data-d="1"]')); await wait(80);

    async function exercise(box, k, label, multi) {
      const openIt = async () => { const b = field(box, k); if (!b) return false; b.scrollIntoView({ block: 'center' }); tap(b); await wait(40); return isOpen(); };
      // 1. open → first option → closes, value set
      ok(await openIt(), `${label}: popover did not open`);
      const firstOpt = $('.pop-i[data-v]');
      ok(!!firstOpt, `${label}: no options listed`);
      const optText = firstOpt ? firstOpt.dataset.v : '';
      if (firstOpt) tap(firstOpt);
      await wait(60);
      ok(!isOpen(), `${label}: popover stayed open after picking`);
      if (field(box, k)) { field(box, k).scrollIntoView({ block: 'center' }); ok(!blocksTaps(field(box, k)), `${label}: closed list still covers the field and blocks taps`); }
      ok(valueOf(box, k) && !/^Any$/.test(valueOf(box, k)), `${label}: value not shown after picking (${valueOf(box, k)})`);
      // 2. field ✕ clears
      const x = $(`${box} .pk-c[data-clear="${k}"]`);
      ok(!!x, `${label}: no clear ✕ on the field`);
      if (x) { tap(x); await wait(60); }
      ok(!$(`${box} .pk-c[data-clear="${k}"]`), `${label}: field ✕ did not clear`);
      // 3. search + Enter picks the top match and closes
      await openIt();
      type($('.pop-q'), optText.slice(0, 4));
      key($('.pop-q'), 'Enter');
      await wait(60);
      ok(!isOpen(), `${label}: Enter did not close`);
      ok($(`${box} .pk-c[data-clear="${k}"]`), `${label}: Enter did not set a value`);
      // 4. "Clear (let the engine decide)" item
      await openIt();
      tap($('.pop-i[data-clear]'));
      await wait(60);
      ok(!isOpen(), `${label}: clear item did not close`);
      ok(!$(`${box} .pk-c[data-clear="${k}"]`), `${label}: clear item did not clear`);
      // 5. type your own (typed in search, then the ✎ row)
      await openIt();
      type($('.pop-q'), 'zz custom value');
      tap($('.pop-i[data-own]'));
      await wait(60);
      ok(!isOpen(), `${label}: type-your-own did not close`);
      ok((valueOf(box, k) || '').toLowerCase().includes('zz custom value'), `${label}: custom value not applied`);
      // 6. type your own via the ✎ row → textarea → Enter
      if (!multi) {
        await openIt();
        tap($('.pop-i[data-own]'));
        await wait(30);
        const ta = $('.pop-t');
        ok(!!ta, `${label}: custom textarea did not appear`);
        if (ta) { ta.value = 'yy typed'; key(ta, 'Enter'); await wait(60); }
        ok(!isOpen(), `${label}: textarea Enter did not close`);
        ok((valueOf(box, k) || '').includes('yy typed'), `${label}: textarea value not applied`);
      }
      // 7–10. popover ✕, Escape, outside tap, tapping the same field again: all close
      for (const [how, act] of [['popover ✕', () => tap($('.pop-x'))], ['Escape', () => key(document.body, 'Escape')], ['outside tap', () => tap($('.top'))], ['same field tapped again', () => tap(field(box, k))], ['section heading tapped', () => tap($(`${box}`).closest('.card').querySelector('summary'))]]) {
        await openIt();
        act();
        await wait(50);
        ok(!isOpen(), `${label}: ${how} did not close`);
        $$('details.builder, #castBox details.sec').forEach((d) => (d.open = true));
      }
      // 11. tapping a different field switches to that field's list
      const other = $$(`${box} .pk .pk-b[data-k]`).find((b) => b.dataset.k !== k && !b.disabled);
      if (other) {
        await openIt();
        tap(other);
        await wait(30);
        ok(isOpen() && pop().querySelector('.pop-q').placeholder.toLowerCase().includes(other.closest('.pk').querySelector('.pk-l').firstChild.textContent.trim().toLowerCase().slice(0, 6)), `${label}: tapping another field did not switch lists`);
        tap(other); await wait(30);
        ok(!isOpen(), `${label}: switched list did not close on second tap`);
      }
      // 12. multi: add two, both kept, remove one
      if (multi) {
        const bx = $(`${box} .pk-c[data-clear="${k}"]`); if (bx) { tap(bx); await wait(50); }
        await openIt(); tap($$('.pop-i[data-v]')[0]); await wait(50);
        await openIt(); tap($$('.pop-i[data-v]:not(.on)')[0]); await wait(50);
        ok((valueOf(box, k) || '').split(',').length >= 2, `${label}: multi-select did not keep two values`);
        await openIt(); ok($$('.pop-i.on').length >= 2, `${label}: ticks not shown for selected values`); tap($('.pop-i.on')); await wait(50);
        ok((valueOf(box, k) || '').split(',').length === 1, `${label}: clicking a ticked value did not remove it`);
      }
      // leave the field clear
      const cx = $(`${box} .pk-c[data-clear="${k}"]`); if (cx) { tap(cx); await wait(40); }
    }

    for (const tabIdx of [0, 1]) {
      tap($$('.ctab')[tabIdx]); await wait(60);
      $$('#castBox .sec').forEach((d) => (d.open = true));
      await wait(60);
      const who = tabIdx ? 'man' : 'woman';
      const keys = $$('#castBox .pk-b[data-k]').map((b) => b.dataset.k).filter((k) => k !== 'ageBracket');
      for (const k of keys) {
        const b = field('#castBox', k);
        if (!b || b.disabled) continue;
        const multi = !!b.closest('.pk').querySelector('.pk-l em');
        await exercise('#castBox', k, `${who}/${k}`, multi);
      }
      // face tiles, skin swatches, age
      const tile = $('#castBox .tile[data-face="oval"]'); tap(tile); await wait(50);
      ok($('#castBox .tile[data-face="oval"]').classList.contains('on'), `${who}: face tile did not select`);
      tap($('#castBox .tile[data-face="oval"]')); await wait(50);
      ok(!$('#castBox .tile.on:not(.own)'), `${who}: face tile did not toggle off`);
      tap($('#castBox .tile.own')); await wait(40); type($('.pop-q'), 'softly angular'); key($('.pop-q'), 'Enter'); await wait(50);
      ok($('#castBox .tile.own.on'), `${who}: custom face shape not applied`);
      const sw = $('#castBox .swb[data-skin="olive"]'); tap(sw); await wait(50);
      ok($('#castBox .swb[data-skin="olive"]').classList.contains('on'), `${who}: skin swatch did not select`);
      tap($('#castBox .swb[data-skin="olive"]')); await wait(50);
      ok(!$('#castBox .swb.on'), `${who}: skin swatch did not toggle off`);
      tap($('#castBox [data-age="30"]')); await wait(50);
      ok(/30 years/.test($('#castBox .age-v').textContent), `${who}: age chip did not apply`);
      tap($('#castBox .age-dd')); await wait(40); tap($$('.pop-i[data-v]')[2]); await wait(50);
      ok(!isOpen() && /years/.test($('#castBox .age-v').textContent), `${who}: age bracket did not apply/close`);
      const r = $('#castBox .age-r'); r.value = 15; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); await wait(60);
      ok($('#castBox .pk.off'), `${who}: adult-only fields not disabled for a 15-year-old`);
      tap($('#castBox [data-age=""]')); await wait(50);
      ok(/Any age|from keywords/.test($('#castBox .age-v').textContent), `${who}: "Any" age did not clear`);
    }
    // scene fields
    const sceneKeys = $$('#sceneBox .pk-b[data-k]').map((b) => b.dataset.k);
    for (const k of sceneKeys) await exercise('#sceneBox', k, `scene/${k}`, false);

    tap($('#resetBtn')); await wait(80);
    return { checks, failed: fails.length, fails };
  };
})();
