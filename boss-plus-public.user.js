// ==UserScript==
// @name         Boss-Plus Public
// @namespace    https://github.com/ANICIFIA/boss-plus-public
// @version      1.0.1
// @author       ANICIFIA
// @license      MIT
// @description  通用 AI 招呼语生成 + 智能投递助手，支持自定义大模型 API 和个人经验数据导入
// @match        https://www.zhipin.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @supportURL   https://github.com/ANICIFIA/boss-plus-public/issues
// @downloadURL  https://github.com/ANICIFIA/boss-plus-public/releases/latest/download/boss-plus-public.user.js
// @updateURL    https://github.com/ANICIFIA/boss-plus-public/releases/latest/download/boss-plus-public.user.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  var BPE_VERSION = (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || 'dev';

  // ==================== CSS ====================

  function injectCSS(rule) {
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(rule);
    } else {
      const style = document.createElement('style');
      style.textContent = rule;
      (document.head || document.documentElement).appendChild(style);
    }
  }

  injectCSS(`
    :root {
      --bpe-primary: #00a6a7;
      --bpe-primary-hover: #008c8d;
      --bpe-font: system-ui, -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
      --bpe-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    }

    .bpe-floating-actions {
      position: fixed; left: 24px; bottom: 24px; z-index: 999997;
      display: flex; flex-direction: column-reverse; gap: 8px;
    }
    .bpe-floating-actions .item {
      box-sizing: border-box; position: relative; width: 48px; height: 48px;
      border-radius: 50%; background: var(--bpe-primary); color: #fff;
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background-color .3s ease, transform .12s ease;
    }
    .bpe-floating-actions .item:hover {
      background: var(--bpe-primary-hover); transform: scale(1.05);
    }
    .bpe-floating-actions .item.active { background: #30d158; }
    .bpe-floating-actions .item.active:hover { background: #28b84c; }
    .bpe-floating-actions .bpe-skip-btn { background: #f59e0b; }
    .bpe-floating-actions .bpe-skip-btn:hover { background: #d97706; }
    .bpe-floating-actions .item:after {
      content: attr(data-tooltip); position: absolute; left: 100%; top: 50%;
      transform: translateY(-50%) translate(8px); background: #16161ae6; color: #fff;
      font-size: 13px; padding: 6px 12px; border-radius: 6px; white-space: nowrap;
      opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .25s ease, visibility .25s ease, transform .25s ease;
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    .bpe-floating-actions .item:hover:after {
      opacity: 1; visibility: visible; transform: translateY(-50%) translate(16px);
    }

    .bpe-toast-container {
      position: fixed; top: 24px; left: 50%; transform: translate(-50%);
      z-index: 9999999; display: flex; flex-direction: column; align-items: center; gap: 12px;
      pointer-events: none;
    }
    .bpe-toast-item {
      display: flex; align-items: center; padding: 12px 20px; background: #fff;
      border-radius: 12px; border: 1px solid rgba(0,0,0,.04);
      transform: translateY(-16px) scale(.96); opacity: 0;
      transition: transform .4s cubic-bezier(.2,0,0,1), opacity .4s cubic-bezier(.2,0,0,1);
      pointer-events: auto;
    }
    .bpe-toast-item.show { transform: translateY(0) scale(1); opacity: 1; }
    .bpe-toast-success .bpe-toast-icon { color: var(--bpe-primary); }
    .bpe-toast-error .bpe-toast-icon { color: #ff4d4f; }
    .bpe-toast-warn .bpe-toast-icon { color: #ff9500; }
    .bpe-toast-icon { display: flex; margin-right: 10px; }
    .bpe-toast-msg { font-size: 14px; color: #222; line-height: 1.4; }

    .bpe-log-panel {
      position: fixed; bottom: 24px; left: 84px; z-index: 999996;
      width: 360px; max-height: 320px; background: #16161aeb;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-radius: 12px; border: 1px solid rgba(255,255,255,.08);
      font-family: var(--bpe-font); overflow: hidden;
      opacity: 0; visibility: hidden;
      transform: translateY(8px) scale(.96);
      transition: opacity .25s ease, visibility .25s ease, transform .25s ease;
    }
    .bpe-log-panel.show { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
    .bpe-log-panel .header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .bpe-log-panel .title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; color: #ffffffe6;
    }
    .bpe-log-panel .dot {
      width: 7px; height: 7px; border-radius: 50%; background: #30d158;
      animation: bpe-dot-blink 1.5s ease-in-out infinite;
    }
    .bpe-log-panel .dot.stopped { background: #636366; animation: none; }
    @keyframes bpe-dot-blink { 0%, to { opacity: 1; } 50% { opacity: .3; } }
    .bpe-log-panel .close-btn {
      width: 24px; height: 24px; border-radius: 6px; border: none;
      background: transparent; color: #fff6; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .bpe-log-panel .close-btn:hover { background: #ffffff14; color: #ffffffb3; }
    .bpe-log-panel .body {
      padding: 8px 0; max-height: 240px; overflow-y: auto;
      overscroll-behavior: contain;
    }
    .bpe-log-panel .body::-webkit-scrollbar { width: 4px; }
    .bpe-log-panel .body::-webkit-scrollbar-thumb { background: #ffffff1a; border-radius: 2px; }
    .bpe-log-panel .empty { padding: 24px 16px; text-align: center; color: #fff3; font-size: 12px; }
    .bpe-log-panel .entry {
      padding: 6px 16px; display: flex; align-items: flex-start; gap: 10px;
      font-size: 12px; line-height: 1.5;
    }
    .bpe-log-panel .entry .time { color: #ffffff40; font-size: 11px; font-family: var(--bpe-font-mono); flex-shrink: 0; }
    .bpe-log-panel .entry .msg { color: #ffffffb3; word-break: break-all; }
    .bpe-log-panel .entry.bpe-log-success .msg { color: #30d158d9; }
    .bpe-log-panel .entry.bpe-log-error .msg { color: #ff453ad9; }
    .bpe-log-panel .entry.bpe-log-warn .msg { color: #ffd60ad9; }
    .bpe-log-panel .count { margin-left: 4px; color: #30d158; font-size: 12px; }

    .bpe-modal-overlay {
      position: fixed; inset: 0; background: #0006; z-index: 999999;
      opacity: 0; visibility: hidden; transition: opacity .2s ease;
    }
    .bpe-modal-overlay.show { opacity: 1; visibility: visible; }
    .bpe-modal-panel {
      box-sizing: border-box; position: fixed; top: 50%; left: 50%;
      width: calc(100% - 40px); max-width: 520px; background: #fff;
      border-radius: 16px; border: 1px solid rgba(0,0,0,.08); padding: 28px 24px 24px;
      opacity: 0; visibility: hidden;
      transform: translate(-50%, -48%);
      transition: opacity .3s ease, visibility .3s ease, transform .3s cubic-bezier(.4,0,.2,1);
      -webkit-font-smoothing: antialiased;
    }
    .bpe-modal-overlay.show .bpe-modal-panel {
      opacity: 1; visibility: visible; transform: translate(-50%, -50%);
    }
    .bpe-modal-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
    }
    .bpe-modal-title { font-size: 18px; font-weight: 700; color: #111827; }
    .bpe-modal-close {
      background: transparent; border: none; color: #9ca3af; cursor: pointer;
      width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;
      border-radius: 50%; transition: color .2s, background .2s;
    }
    .bpe-modal-close:hover { color: #111827; background: #f3f4f6; }
    .bpe-modal-content { font-size: 14px; color: #4b5563; line-height: 1.6; max-height: 60vh; overflow-y: auto; }
    .bpe-modal-content::-webkit-scrollbar { display: none; }
    .bpe-modal-footer { margin-top: 20px; display: flex; justify-content: stretch; gap: 12px; }

    .bpe-btn {
      all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
      padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; text-align: center; transition: background .2s, transform .12s ease;
    }
    .bpe-btn-primary { background: var(--bpe-primary); color: #fff; width: 100%; }
    .bpe-btn-primary:hover { background: var(--bpe-primary-hover); }
    .bpe-btn-secondary { background: #fff; color: #4b5563; border: 1px solid #dcdfe6; width: 100%; }
    .bpe-btn-secondary:hover { background: #f5f7fa; border-color: #c0c4cc; }
    .bpe-btn-danger { background: #dc2626; color: #fff; }
    .bpe-btn-danger:hover { background: #b91c1c; }

    .bpe-settings-group { display: flex; flex-direction: column; gap: 16px; }
    .bpe-settings-label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .bpe-settings-label span { font-size: 14px; font-weight: 600; color: #1f2329; }
    .bpe-settings-desc { font-size: 12px; color: #8f959e; margin-top: 2px; }

    .bpe-toggle {
      position: relative; width: 44px; height: 24px; flex-shrink: 0;
    }
    .bpe-toggle input { opacity: 0; width: 0; height: 0; }
    .bpe-toggle .slider {
      position: absolute; cursor: pointer; inset: 0; background: #d1d5db;
      border-radius: 12px; transition: background .3s;
    }
    .bpe-toggle .slider:before {
      content: ""; position: absolute; left: 2px; bottom: 2px;
      width: 20px; height: 20px; background: #fff; border-radius: 50%;
      transition: transform .3s;
    }
    .bpe-toggle input:checked + .slider { background: var(--bpe-primary); }
    .bpe-toggle input:checked + .slider:before { transform: translateX(20px); }

    .bpe-input {
      box-sizing: border-box; width: 100%; height: 38px; padding: 8px 12px;
      border: 1px solid #e3e7ed; border-radius: 6px; font-size: 14px;
      outline: none; transition: border-color .2s;
    }
    .bpe-input:focus { border-color: var(--bpe-primary); }

    .bpe-number-input {
      box-sizing: border-box; width: 80px; height: 32px; padding: 4px 8px;
      border: 1px solid #e3e7ed; border-radius: 6px; font-size: 14px; text-align: center;
    }

    .bpe-company-manager { display: flex; flex-direction: column; gap: 12px; }
    .bpe-company-manager .add-row { display: flex; gap: 8px; align-items: stretch; }
    .bpe-company-manager .add-row input { flex: 1; min-width: 0; }
    .bpe-company-manager .add-row button { flex-shrink: 0; }
    .bpe-company-list {
      border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc;
      max-height: 300px; overflow-y: auto;
    }
    .bpe-company-list::-webkit-scrollbar { width: 6px; }
    .bpe-company-list::-webkit-scrollbar-thumb { background: #d0d4da; border-radius: 3px; }
    .bpe-company-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid #eef0f3; background: #fff;
    }
    .bpe-company-item:last-child { border-bottom: 0; }
    .bpe-company-item .name { flex: 1; min-width: 0; color: #1f2329; font-size: 14px; }
    .bpe-company-item .delete-btn {
      all: unset; cursor: pointer; color: #9ca3af; padding: 4px 8px; border-radius: 4px;
      font-size: 12px; transition: color .2s, background .2s;
    }
    .bpe-company-item .delete-btn:hover { color: #dc2626; background: #dc26261a; }
    .bpe-company-empty { padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 13px; }
    .bpe-company-count { font-size: 12px; color: #7b8490; text-align: right; padding-top: 4px; }
    .bpe-hint {
      min-height: 18px; font-size: 12px; line-height: 1.5; opacity: 0;
      transition: opacity .2s;
    }
    .bpe-hint.show { opacity: 1; }
    .bpe-hint.error { color: #dc2626; }
    .bpe-hint.success { color: var(--bpe-primary); }

    .bpe-repeater-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; min-height: 0; }
    .bpe-tag {
      box-sizing: border-box; display: inline-flex; align-items: center;
      background: #f8f8f8; color: #333; padding: 6px 12px;
      border: 1px solid #e3e7ed; border-radius: 6px; font-size: 12px;
      gap: 6px; transition-property: border-color,background-color,color,opacity,transform;
      transition-duration: .2s,.2s,.2s,.25s,.25s;
      transition-timing-function: cubic-bezier(.2,0,0,1),cubic-bezier(.2,0,0,1),cubic-bezier(.2,0,0,1),cubic-bezier(.4,0,.2,1),cubic-bezier(.4,0,.2,1);
      transform-origin: center center;
    }
    .bpe-tag-locked { background: #00a6a7; color: #fff; border-color: #00a6a7; }
    .bpe-tag-lock {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; cursor: pointer; font-size: 11px;
      line-height: 1; transition: opacity .2s; user-select: none;
    }
    .bpe-tag-lock:hover { opacity: .7; }
    .bpe-tag-remove {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
      color: #999; font-size: 12px; line-height: 1; transition: color .2s, background .2s;
    }
    .bpe-tag-locked .bpe-tag-remove { color: rgba(255,255,255,.7); }
    .bpe-tag-locked .bpe-tag-remove:hover { color: #fff; background: rgba(255,255,255,.2); }
    .bpe-tag-remove:hover { color: #dc2626; background: #dc26261a; }
    .bpe-multiselect-option {
      display: inline-flex; align-items: center; margin-right: 14px; margin-bottom: 6px;
      font-size: 13px; cursor: pointer; gap: 5px;
    }
    .bpe-multiselect-option input[type=checkbox] {
      accent-color: var(--bpe-primary);
    }

    .bpe-range-row { display: flex; align-items: center; gap: 8px; }
    .bpe-range-row span { color: #6b7280; font-size: 13px; }

    .bpe-btn-sm {
      padding: 6px 14px; font-size: 13px; border-radius: 6px;
    }
  `);

  // ==================== UTILS ====================

  function $(sel, parent) { return (parent || document).querySelector(sel); }
  function $$(sel, parent) { return Array.from((parent || document).querySelectorAll(sel)); }
  function strip(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function sleep(min, max) {
    const ms = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
    return new Promise(r => setTimeout(r, ms));
  }

  function now() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  // Web Audio API 提示音（无需外部文件）
  function playBeep(freq, duration, type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
      setTimeout(function () { ctx.close(); }, duration * 1000 + 200);
    } catch (e) {}
  }

  function playCompleteSound() {
    playBeep(523, 0.15, 'sine');  // C5
    setTimeout(function () { playBeep(659, 0.25, 'sine'); }, 160); // E5
  }

  function playErrorSound() {
    playBeep(330, 0.15, 'square'); // E4
    setTimeout(function () { playBeep(262, 0.3, 'square'); }, 160); // C4
  }

  // 控制台测试入口：bpe_testSound('complete') / bpe_testSound('error')
  window.bpe_testSound = function (type) {
    if (type === 'complete') { playCompleteSound(); console.log('[BPE] 播放完成提示音 (升调 C5→E5)'); }
    else if (type === 'error') { playErrorSound(); console.log('[BPE] 播放中断提示音 (降调 E4→C4)'); }
    else { console.log('[BPE] 用法: bpe_testSound("complete") 或 bpe_testSound("error")'); }
  };
  window.bpe_version = BPE_VERSION;

  function simulateMouseMove(el) {
    const rect = el.getBoundingClientRect();
    const margin = 3;
    const tx = rect.left + margin + Math.random() * Math.max(0, rect.width - margin * 2);
    const ty = rect.top + margin + Math.random() * Math.max(0, rect.height - margin * 2);
    const sx = tx + (Math.random() - 0.5) * 400;
    const sy = ty + (Math.random() - 0.5) * 400;
    const steps = 3 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= steps; i++) {
      const pct = i / steps;
      const cx = sx + (tx - sx) * pct + (Math.random() - 0.5) * 8;
      const cy = sy + (ty - sy) * pct + (Math.random() - 0.5) * 8;
      el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
    }
  }

  async function simulateClick(el) {
    await simulateMouseMove(el);
    const rect = el.getBoundingClientRect();
    const margin = 3;
    const cx = rect.left + margin + Math.random() * Math.max(0, rect.width - margin * 2);
    const cy = rect.top + margin + Math.random() * Math.max(0, rect.height - margin * 2);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
  }

  function waitFor(selector, timeout, parent) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const el = $(selector, parent || document);
        if (el) { resolve(el); return; }
        if (Date.now() - start >= timeout) { reject(new Error(`Timeout waiting for "${selector}"`)); return; }
        setTimeout(check, 300);
      };
      check();
    });
  }

  // ==================== TOAST ====================

  const ToastIcons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>',
    warn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer || !toastContainer.isConnected) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'bpe-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(msg, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    const container = getToastContainer();
    const el = document.createElement('div');
    el.className = `bpe-toast-item bpe-toast-${type}`;
    const icon = ToastIcons[type] || ToastIcons.success;
    el.innerHTML = `<div class="bpe-toast-icon">${icon}</div><div class="bpe-toast-msg">${msg}</div>`;
    container.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('show')); });
    if (duration > 0) {
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, duration);
    }
  }

  // ==================== LOG PANEL ====================

  function createLogPanel(title) {
    const panel = document.createElement('div');
    panel.className = 'bpe-log-panel';
    panel.innerHTML = '<div class="header"><div class="title"><span class="dot stopped"></span><span>' + title + '</span><span class="count"></span></div><span style="font-size:11px;color:#ffffff4d;margin-right:4px;">v' + BPE_VERSION + '</span><button class="close-btn">&times;</button></div><div class="body"><div class="empty">等待启动...</div></div>';
    const dot = panel.querySelector('.dot');
    const body = panel.querySelector('.body');
    const empty = panel.querySelector('.empty');
    const countEl = panel.querySelector('.count');
    panel.querySelector('.close-btn').onclick = () => panel.classList.remove('show');
    document.body.appendChild(panel);
    return {
      panel, dot, body, countEl,
      show() { panel.classList.add('show'); },
      hide() { panel.classList.remove('show'); },
      setActive(active) { dot.classList.toggle('stopped', !active); },
      updateCount(cnt, limit) { countEl.textContent = `(${cnt}/${limit > 0 ? limit : '∞'})`; },
      log(msg, type) {
        if (empty) empty.remove();
        const entry = document.createElement('div');
        entry.className = `entry bpe-log-${type || 'info'}`;
        entry.innerHTML = `<span class="time">${now()}</span><span class="msg">${msg}</span>`;
        body.appendChild(entry);
        body.scrollTop = body.scrollHeight;
      },
      clear() { body.innerHTML = ''; }
    };
  }

  // ==================== CONFIG ====================

  const CONFIG_KEY = 'bp_enhanced_config';
  const COMPANY_LIST_KEY = 'bp_enhanced_blocked_companies';
  const RESUME_DATA_KEY = 'bp_enhanced_resume_data';


  const DEFAULTS = {
    deepseekApiKey: GM_getValue('deep_api_key', '') || '',
    deepseekModel: 'deepseek-v4-flash',
    deepseekBaseUrl: 'https://api.deepseek.com',
    applyLimit: 10,
    refreshLimit: 10,
    applyIntervalMin: 5,
    applyIntervalMax: 20,
    skipCommunicated: true,
    jobWhitelist: [],
    jobBlacklist: [],
    salaryMin: 0,
    salaryMax: 0,
    skipInactiveRecruiter: false,
    allowedRecruiterStatuses: [],
    validateGreeting: true,
    enableAIFilter: false,
    aiFilterThreshold: 0.35,
    aiKnowledgeBaseId: 'full_table'
  };

  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }

  function saveConfig(updates) {
    if (_settingsDirty) return;
    const config = getConfig();
    Object.assign(config, updates);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function getApiKey() {
    return getConfig().deepseekApiKey || GM_getValue('deep_api_key', '') || '';
  }

  function setApiKey(key) {
    GM_setValue('deep_api_key', key);
  }

  // ==================== COMPANY BLOCKLIST ====================

  function getBlockedCompanies() {
    try {
      const raw = localStorage.getItem(COMPANY_LIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  var _settingsDirty = false;
function saveBlockedCompanies(list) {
    if (_settingsDirty) return;
    localStorage.setItem(COMPANY_LIST_KEY, JSON.stringify(list));
  }

  function addBlockedCompany(name) {
    name = name.trim();
    if (!name) return false;
    const list = getBlockedCompanies();
    if (list.some(c => c.name === name)) return false;
    list.push({ name, time: Date.now() });
    saveBlockedCompanies(list);
    return true;
  }

  function removeBlockedCompany(name) {
    const list = getBlockedCompanies();
    const idx = list.findIndex(function(c) { return c.name === name; });
    if (idx === -1) return false;
    list.splice(idx, 1);
    saveBlockedCompanies(list);
    return true;
  }

  function clearBlockedCompanies() {
    const list = getBlockedCompanies();
    list.length = 0;
    saveBlockedCompanies(list);
  }

  function isCompanyBlocked(name) {
    name = (name || '').trim();
    if (!name) return false;
    return getBlockedCompanies().some(c => c.name === name);
  }

  // ==================== JOB KEYWORD & SALARY FILTER ====================

  // Normalize whitelist item: old format was string, new format is {text, locked}
  function _normalizeWL(item) {
    if (typeof item === 'string') return { text: item, locked: false };
    return { text: (item.text || '').trim(), locked: !!item.locked };
  }

  function getJobWhitelist() {
    var raw = getConfig().jobWhitelist || [];
    return raw.map(_normalizeWL).filter(function (k) { return k.text; });
  }

  function _wlRawList() {
    return getConfig().jobWhitelist || [];
  }

  function addJobWhitelistKeyword(keyword) {
    keyword = keyword.trim();
    if (!keyword) return false;
    var list = getJobWhitelist();
    if (list.some(function (k) { return k.text === keyword; })) return false;
    var raw = _wlRawList();
    raw.push({ text: keyword, locked: false });
    saveConfig({ jobWhitelist: raw });
    return true;
  }

  function removeJobWhitelistKeyword(keyword) {
    var raw = _wlRawList();
    var idx = -1;
    for (var i = 0; i < raw.length; i++) {
      if (_normalizeWL(raw[i]).text === keyword) { idx = i; break; }
    }
    if (idx === -1) return false;
    raw.splice(idx, 1);
    saveConfig({ jobWhitelist: raw });
    return true;
  }

  function toggleWhitelistLock(keyword) {
    var raw = _wlRawList();
    for (var i = 0; i < raw.length; i++) {
      var item = raw[i];
      if (typeof item === 'string') {
        if (item === keyword) {
          raw[i] = { text: item, locked: true };
          saveConfig({ jobWhitelist: raw });
          return true;
        }
      } else if (item.text === keyword) {
        item.locked = !item.locked;
        saveConfig({ jobWhitelist: raw });
        return true;
      }
    }
    return false;
  }

  function getJobBlacklist() {
    return getConfig().jobBlacklist || [];
  }

  function addJobBlacklistKeyword(keyword) {
    keyword = keyword.trim();
    if (!keyword) return false;
    var list = getJobBlacklist();
    if (list.indexOf(keyword) !== -1) return false;
    list.push(keyword);
    saveConfig({ jobBlacklist: list });
    return true;
  }

  function removeJobBlacklistKeyword(keyword) {
    var list = getJobBlacklist();
    var idx = list.indexOf(keyword);
    if (idx === -1) return false;
    list.splice(idx, 1);
    saveConfig({ jobBlacklist: list });
    return true;
  }

  function parseSalaryFromJobInfo(jobInfo) {
    // Extract "薪资：..." line
    var match = jobInfo.match(/薪资[：:]\s*(.+?)(?:\n|$)/m);
    if (!match) return null;
    return parseSalaryText(match[1]);
  }

  function parseSalaryText(text) {
    if (!text) return null;
    if (/面议|薪资open/i.test(text)) return null;

    // Try "15K-25K" or "15k-25k" format
    var kMatch = text.match(/(\d+\.?\d*)\s*[Kk]\s*[-–—至~]\s*(\d+\.?\d*)\s*[Kk]/);
    if (kMatch) {
      return { min: parseFloat(kMatch[1]), max: parseFloat(kMatch[2]), text: text };
    }

    // Try "15-25K" (single K at end)
    var singleK = text.match(/(\d+\.?\d*)\s*[-–—至~]\s*(\d+\.?\d*)\s*[Kk]/);
    if (singleK) {
      return { min: parseFloat(singleK[1]), max: parseFloat(singleK[2]), text: text };
    }

    // Try raw numbers like "15000-25000" or "15000-25000/月"
    var rawMatch = text.match(/(\d{4,})\s*[-–—至~]\s*(\d{4,})/);
    if (rawMatch) {
      return { min: Math.round(parseFloat(rawMatch[1]) / 1000), max: Math.round(parseFloat(rawMatch[2]) / 1000), text: text };
    }

    // Try bare K-scale numbers like "16-30" (no K suffix, both 1-200 range)
    var bareK = text.match(/\b(\d{1,3})\s*[-–—至~]\s*(\d{1,3})\b/);
    if (bareK) {
      var bMin = parseFloat(bareK[1]);
      var bMax = parseFloat(bareK[2]);
      if (bMin >= 1 && bMin <= 200 && bMax >= 1 && bMax <= 200) {
        return { min: bMin, max: bMax, text: text };
      }
    }

    // Try single value like "15K以上" or "15K"
    var singleVal = text.match(/(\d+\.?\d*)\s*[Kk]/);
    if (singleVal) {
      var val = parseFloat(singleVal[1]);
      return { min: val, max: val, text: text };
    }

    return null;
  }

  function checkJobFilters(jobInfo, jobName) {
    var config = getConfig();

    // Whitelist check — match against job name
    var whitelist = getJobWhitelist();
    if (whitelist.length > 0) {
      var nameLower = (jobName || '').toLowerCase();
      var lockedItems = whitelist.filter(function (k) { return k.locked; });
      var unlockedItems = whitelist.filter(function (k) { return !k.locked; });

      // Must match ALL locked keywords
      if (lockedItems.length > 0) {
        for (var li = 0; li < lockedItems.length; li++) {
          if (nameLower.indexOf(lockedItems[li].text.toLowerCase()) === -1) {
            var lockedNames = lockedItems.map(function (k) { return k.text; }).join('、');
            return { pass: false, reason: '岗位名未匹配锁定关键词（需包含：' + lockedNames + '）' };
          }
        }
      }

      // Must match at least one unlocked keyword (if any unlocked exist)
      if (unlockedItems.length > 0) {
        var anyMatch = unlockedItems.some(function (k) {
          return nameLower.indexOf(k.text.toLowerCase()) !== -1;
        });
        if (!anyMatch) {
          var names = unlockedItems.map(function (k) { return k.text; }).slice(0, 3).join('、');
          return { pass: false, reason: '岗位名未匹配未锁定关键词（需包含：' + names + (unlockedItems.length > 3 ? '等' : '') + '）' };
        }
      }
    }

    // Blacklist check — match against job name
    var blacklist = config.jobBlacklist || [];
    if (blacklist.length > 0) {
      var nameLower = (jobName || '').toLowerCase();
      var hitKw = blacklist.find(function (kw) {
        return nameLower.indexOf(kw.toLowerCase()) !== -1;
      });
      if (hitKw) {
        return { pass: false, reason: '岗位名命中黑名单关键词：' + hitKw };
      }
    }

    // Salary check — still uses full JD text
    var salaryMin = parseFloat(config.salaryMin) || 0;
    var salaryMax = parseFloat(config.salaryMax) || 0;
    if (salaryMin > 0 || salaryMax > 0) {
      var salary = parseSalaryFromJobInfo(jobInfo);
      if (salary) {
        if (salaryMin > 0 && salary.min < salaryMin) {
          return { pass: false, reason: '薪资下限不满足（岗位' + salary.min + 'K < 设置' + salaryMin + 'K）' };
        }
        if (salaryMax > 0 && salary.max > salaryMax) {
          return { pass: false, reason: '薪资上限超出（岗位' + salary.max + 'K > 设置' + salaryMax + 'K）' };
        }
      }
    }

    return { pass: true };
  }

  // ==================== AI SEMANTIC FILTER ====================

  var _aiFilterCache = {};

  function _hashJd(jd) {
    var hash = 0;
    for (var i = 0; i < Math.min(jd.length, 200); i++) {
      hash = ((hash << 5) - hash) + jd.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  async function checkAIFilter(jobInfo, jobName) {
    var config = getConfig();
    if (!config.enableAIFilter) return { pass: true };

    var cacheKey = _hashJd(jobInfo);
    if (_aiFilterCache[cacheKey] !== undefined) {
      var cached = _aiFilterCache[cacheKey];
      if (cached >= config.aiFilterThreshold) return { pass: true, aiScore: cached };
      return { pass: false, aiScore: cached, reason: 'AI语义匹配度 ' + (cached * 100).toFixed(0) + '% < 阈值' + (config.aiFilterThreshold * 100).toFixed(0) + '%' };
    }

    try {
      var aiCtrl = new AbortController();
      var aiTimeout = setTimeout(function () { aiCtrl.abort(); }, 8000);
      var resp = await fetch('http://localhost:8000/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kb_id: config.aiKnowledgeBaseId || 'full_table',
          query: jobInfo,
          top_k: 10,
          threshold: 0.25
        }),
        signal: aiCtrl.signal
      });
      clearTimeout(aiTimeout);
      if (!resp.ok) { console.warn('[BPE] AI filter 返回非 200: ' + resp.status + '，放行'); return { pass: true }; }

      var data = await resp.json();
      var results = data.results || [];
      var topK = results.slice(0, 5);
      var score = 0;
      if (topK.length > 0) {
        var sum = 0;
        for (var i = 0; i < topK.length; i++) sum += topK[i].similarity;
        score = sum / topK.length;
      }
      _aiFilterCache[cacheKey] = score;

      if (score >= config.aiFilterThreshold) return { pass: true, aiScore: score };
      return { pass: false, aiScore: score, reason: 'AI语义匹配度 ' + (score * 100).toFixed(0) + '% < 阈值' + (config.aiFilterThreshold * 100).toFixed(0) + '%' };
    } catch (e) {
      console.warn('[BPE] AI filter 请求失败（zhitu-ai 未运行？）: ' + (e.name === 'AbortError' ? '请求超时' : e.message) + '，放行');
      return { pass: true };
    }
  }

  // ==================== ENHANCED UTILITIES ====================

  // A3: Preload job cards by scrolling to trigger lazy loading
  async function preloadJobCards() {
    var start = Date.now();
    var timeout = 15000;
    var lastCount = 0;
    while (Date.now() - start < timeout) {
      var cards = getJobCards();
      if (cards.length === lastCount && cards.length > 0) break;
      lastCount = cards.length;
      var lastCard = cards[cards.length - 1];
      if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
      await sleep(1500, 2500);
    }
  }

  // Switch job expectation after page refresh (based on source r2/st/te/a2)
  // Targets: "AI产品经理(上海)" or "产品经理(上海)"
  async function switchToTargetExpect() {
    var expectEl = null;
    for (var i = 0; i < 30; i++) {
      expectEl = document.querySelector('.c-expect-select');
      if (expectEl) break;
      await sleep(500, 600);
    }
    if (!expectEl) {
      log('未找到求职期望选择器(.c-expect-select)', 'warn');
      return;
    }

    var expectItems = expectEl.querySelectorAll('.expect-item');
    var targetNames = ['AI产品经理(上海)', '产品经理(上海)'];
    var targetIdx = -1;
    var targetText = '';

    for (var j = 0; j < expectItems.length; j++) {
      var textEl = expectItems[j].querySelector('.text-content');
      var text = textEl ? (textEl.textContent || '').trim() : '';
      if (targetNames.indexOf(text) !== -1) {
        if (expectItems[j].classList.contains('active') ||
            expectItems[j].querySelector('.active, .selected')) {
          log('求职期望已是目标: ' + text, 'info');
          return;
        }
        targetIdx = j;
        targetText = text;
        break;
      }
    }

    if (targetIdx === -1) {
      log('未找到目标求职期望（AI产品经理(上海)/产品经理(上海)）', 'warn');
      return;
    }

    log('切换求职期望到: ' + targetText, 'info');
    expectItems[targetIdx].click();
    await sleep(2000, 3000);
    log('求职期望切换完成: ' + targetText, 'info');
  }

  // A4: Smart delay with peak-hour adjustment
  function getSmartDelaySeconds() {
    var config = getConfig();
    var baseMin = config.applyIntervalMin || 5;
    var baseMax = config.applyIntervalMax || 20;
    var delay = baseMin + Math.random() * (baseMax - baseMin);
    var hour = new Date().getHours();
    if ((hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 19)) {
      delay *= 1.3 + Math.random() * 0.3;
    }
    return Math.round(delay);
  }

  // A5: Parse recruiter activity from detail panel
  // A5: BOSS直聘活跃度状态查表（完全复制源程序 W2 + Ye + De 逻辑）
  var RECRUITER_STATUS_LABELS = {
    online: '在线', recent: '刚刚活跃', today: '今日活跃',
    threeDays: '3日内活跃', thisWeek: '本周活跃', twoWeeks: '2周内活跃',
    thisMonth: '本月活跃', twoMonths: '2月内活跃'
  };
  var RECRUITER_STATUS_ORDER = ['online', 'recent', 'today', 'threeDays', 'thisWeek', 'twoWeeks', 'thisMonth', 'twoMonths'];

  function W2(text) {
    return String(text || '').replace(/\s+/g, '');
  }

  function Ye(text) {
    var t = W2(text);
    if (!t) return null;
    if (t.indexOf('在线') !== -1) return 'online';
    if (t.indexOf('刚刚活跃') !== -1) return 'recent';
    if (t.indexOf('今日活跃') !== -1) return 'today';
    if (/^(3|三)(日|天)内活跃$/.test(t)) return 'threeDays';
    if (t === '本周活跃') return 'thisWeek';
    if (/^(2|两)(周|星期)内活跃$/.test(t)) return 'twoWeeks';
    if (t === '本月活跃') return 'thisMonth';
    if (/^(2|两)个?月内活跃$/.test(t)) return 'twoMonths';
    return null;
  }

  function parseRecruiterActivity(detailBox) {
    if (!detailBox) return null;
    var el = detailBox.querySelector('.job-boss-info .boss-online-tag, .job-boss-info .boss-active-time');
    if (!el) return null;
    var key = Ye(el.textContent);
    if (!key) return null;
    return { key: key, text: RECRUITER_STATUS_LABELS[key] || '' };
  }

  // B1: Greeting quality validation
  function validateGreetingQuality(greeting) {
    var issues = [];
    if (!greeting) { issues.push('招呼语为空'); return { valid: false, issues: issues }; }
    if (!/尊敬的.*老师.*您好/.test(greeting)) {
      issues.push('缺少问候语「尊敬的老师您好」');
    }
    if (/^#{1,6}\s|^\*\*|^>\s|^-\s/m.test(greeting)) {
      issues.push('包含 Markdown 格式标记');
    }
    if (/招呼语[：:]|生成的招呼|以下是为您|好的，根据|这是.*招呼|我为您生成/.test(greeting)) {
      issues.push('包含 AI 说明文字（需去除引导语）');
    }
    if (greeting.length < 50) {
      issues.push('招呼语过短（< 50 字）');
    }
    if (greeting.length > 800) {
      issues.push('招呼语过长（> 800 字）');
    }
    return { valid: issues.length === 0, issues: issues };
  }

  // B5: Simple keyword match analysis for debug
  function extractKeywords(text) {
    var kw = [];
    var words = text.replace(/[^一-龥a-zA-Z0-9]+/g, ' ').split(/\s+/).filter(Boolean);
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.length >= 2 && !/^\d+$/.test(w)) kw.push(w);
    }
    return kw.slice(0, 30);
  }

  function analyzeExperienceMatch(jd) {
    var keywords = extractKeywords(jd);
    var resumeData = getResumeData();
    if (!resumeData.length) return results;
    var sorted = [].concat(resumeData).sort(function (a, b) { return parseInt(b['匹配权重']) - parseInt(a['匹配权重']); });
    var results = [];
    for (var i = 0; i < sorted.length; i++) {
      var item = sorted[i];
      var desc = item['项目介绍'] || '';
      var score = 0;
      for (var j = 0; j < keywords.length; j++) {
        if (desc.indexOf(keywords[j]) !== -1) score++;
      }
      if (score > 0) {
        results.push({ idx: i, score: score, role: item['担任角色/岗位'], company: item['主体名称'], weight: item['匹配权重'] });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 8);
  }

  // ==================== RESUME DATA (user-imported) ====================

  // Experience data loaded from localStorage (import via settings panel).
  // Each entry: { "经验分类", "主体名称", "担任角色/岗位", "起止时间", "项目介绍", "匹配权重" }
  function getResumeData() {
    try {
      var raw = localStorage.getItem(RESUME_DATA_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch (e) {}
    return [];
  }

  function setResumeData(data) {
    localStorage.setItem(RESUME_DATA_KEY, JSON.stringify(data));
  }

  // Parse user-pasted JSON, auto-fixing literal control chars (newlines/tabs)
  // that are illegal in JSON strings but common in JS-originated data
  function parseResumeJSON(raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (e.message.indexOf('Bad control character') !== -1 || e.message.indexOf('Unexpected token') !== -1) {
        // Escape literal control characters and retry
        var cleaned = raw
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t');
        return JSON.parse(cleaned);
      }
      throw e;
    }
  }




  // Build resume summary for system prompt (compressed but complete)
  function buildResumeSummary() {
    var resumeData = getResumeData();
    if (!resumeData.length) return '（未导入个人经验，请在设置面板中导入）';
    // Sort by priority descending
    const sorted = [...resumeData].sort((a, b) => parseInt(b['匹配权重']) - parseInt(a['匹配权重']));
    const lines = [];
    lines.push('## 我的过往经验（按优先级从高到低排列，数字越大越优先匹配）：');
    lines.push('');
    let lastCategory = '';
    sorted.forEach((item, idx) => {
      const category = item['经验分类'];
      const weight = item['匹配权重'];
      const company = item['主体名称'];
      const role = item['担任角色/岗位'];
      const time = item['起止时间'];
      const desc = item['项目介绍'];
      if (category !== lastCategory) {
        lines.push(`### ${category}：`);
        lastCategory = category;
      }
      lines.push(`[${idx + 1}] (优先级${weight}) ${role} | ${company} | ${time}`);
      lines.push(`内容：${desc}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  // ==================== DEEPSEEK API ====================

  var SYSTEM_PROMPT_CACHE = null;

  async function getSystemPromptTemplate() {
    // 已有缓存直接返回，避免每次 fetch localhost 卡 2 分钟
    if (SYSTEM_PROMPT_CACHE) return SYSTEM_PROMPT_CACHE;

    // 1. 优先从本地服务器实时拉取（确保每次修改 prompt 立即生效），设 3s 超时
    try {
      var ctrl = new AbortController();
      var timeout = setTimeout(function () { ctrl.abort(); }, 3000);
      var resp = await fetch('http://localhost:8765/system-prompt.txt', { signal: ctrl.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        var text = await resp.text();
        if (text && text.trim()) {
          SYSTEM_PROMPT_CACHE = text;
          return SYSTEM_PROMPT_CACHE;
        }
      }
    } catch (e) {
      console.warn('[BPE] fetch prompt 失败（服务器未运行？），尝试备用方案:', e.message);
    }

    // 2. 备用：Tampermonkey @resource 缓存
    try {
      var resourceText = GM_getResourceText('systemPrompt');
      if (resourceText && resourceText.trim()) {
        SYSTEM_PROMPT_CACHE = resourceText;
        return SYSTEM_PROMPT_CACHE;
      }
    } catch (e) {}

    // 3. 最后兜底：硬编码默认 prompt
    console.error('[BPE] ⚠ 使用硬编码兜底 prompt，system-prompt.txt 未生效！请检查 server.js 是否运行');
    SYSTEM_PROMPT_CACHE = '你是一位专业的求职沟通助手。你的任务是根据我的个人过往经验，为特定岗位生成一段个性化、专业、真诚的招呼语，用于在BOSS直聘上与招聘者沟通。\n我的过往经验（按优先级从高到低排列，数字越大越优先匹配）：\n{{RESUME_SUMMARY}}\n招呼语格式要求（严格遵守）\n第一段（首段开场）：20-30字，必须包含「核心身份+总览成果+1个最匹配核心能力」，100%基于真实经验，禁止任何虚构引申。\n第二段（总览介绍）：「尊敬的HR老师您好～」开头，基于个人经验数据概括核心优势，表达应聘该岗位的真诚意愿。并且说明个人优势有”以下几个方面：”，总计80字内\n接下来分段以第一人称介绍个人匹配的核心优势：最多3个优势，每个优势80字内，独立成段。严格遵循「通过经验提取通用能力标签（“擅长XXXX：”）+具体项目佐证+量化成果+岗位迁移价值」结构，先提炼能力，再用项目数据支撑。\n最后一段：结合公司/行业特点表达兴趣，结尾统一为「期待随时沟通～」。\n匹配经验的选择规则：\n绝对真实性红线（三禁止）：\n禁止编造任何不存在的经验、数据和能力\n禁止将教育背景、行业认知等同于实际产品/项目经验\n禁止跨领域过度引申（如电商B端≠金融B端）\n每条经验独立使用，禁止将不同编号的经验内容拼接混合，不得篡改原始数据。\n优先选择与JD匹配度最高的经验；匹配度相近时，选择优先级更高的经验。禁止为了使用高优先级经验而强行匹配不相关内容。\n类型匹配优先：产品岗优先产品工作经验，分析岗优先分析经验。当无直接领域经验时，优先匹配可迁移的通用产品能力。\n低匹配度场景规范：当无直接相关经验时，必须主动说明「虽无XX领域直接经验，但具备可快速迁移的XX能力」，严禁强行声称有相关经验。\n注意事项\n自然真诚，不夸大不营销，保持专业的同时有人情味\n所有内容必须100%来自提供的经验列表\n优先展示量化成果，用数据说话\n每个优势必须明确说明对目标岗位的具体价值\n只返回最终的招呼语文本，不要添加任何解释、说明、标题或标记';
    return SYSTEM_PROMPT_CACHE;
  }


  async function buildSystemPrompt() {
    var template = await getSystemPromptTemplate();
    return template.replace('{{RESUME_SUMMARY}}', buildResumeSummary());
  }

  var lastApiError = null;

  async function callDeepSeekForGreeting(jobInfo) {
    var config = getConfig();
    var apiKey = getApiKey();
    if (!apiKey) {
      lastApiError = 'API Key 未设置';
      return null;
    }
    try {
      var url = (config.deepseekBaseUrl || 'https://api.deepseek.com').replace(/\/+$/, '') + '/chat/completions';
      var apiCtrl = new AbortController();
      var apiTimeout = setTimeout(function () { apiCtrl.abort(); }, 20000);
      var resp = await fetch(url, {
        signal: apiCtrl.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: config.deepseekModel || 'deepseek-chat',
          messages: [
            { role: 'system', content: await buildSystemPrompt() },
            { role: 'user', content: '请根据以下岗位信息，为我生成个性化招呼语：\n\n' + jobInfo }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });
      clearTimeout(apiTimeout);
      if (!resp.ok) {
        var errText = await resp.text().catch(function () { return ''; });
        var detail = errText;
        try {
          var errJson = JSON.parse(errText);
          detail = errJson.error?.message || errText;
        } catch (ex) {}
        lastApiError = 'HTTP ' + resp.status + ': ' + (detail || '未知错误').substring(0, 300);
        return null;
      }
      var data = await resp.json();
      if (data.error) {
        lastApiError = 'API 错误: ' + (data.error.message || JSON.stringify(data.error)).substring(0, 300);
        return null;
      }
      var c0 = data.choices?.[0];
      var finishReason = c0?.finish_reason || 'none';
      var contentLen = (c0?.message?.content || '').length;
      var greeting = c0?.message?.content?.trim() || null;
      if (!greeting) {
        lastApiError = 'API 返回为空 | finish=' + finishReason + ' | contentLen=' + contentLen + ' | model=' + (data.model || '?');
      }
      if (greeting && finishReason === 'length') {
        console.warn('[BPE] DeepSeek 返回被截断 (finish_reason=length, contentLen=' + contentLen + ')。招呼语可能不完整。');
      }
      return greeting;
    } catch (e) {
      try { clearTimeout(apiTimeout); } catch (ex) {}
      lastApiError = (e.message || String(e)).substring(0, 300);
      return null;
    }
  }

  // Extract basic job info from a card DOM element (no detail panel needed)
  function extractCardBasicInfo(cardEl) {
    var lines = [];
    var jobName = (cardEl.querySelector('.job-name') || {}).textContent || '';
    jobName = jobName.trim();
    var companyName = (cardEl.querySelector('.boss-name') || {}).textContent || '';
    companyName = companyName.trim();
    var salary = (cardEl.querySelector('.job-salary, .salary') || {}).textContent || '';
    salary = salary.trim();
    if (jobName) lines.push(salary ? jobName + ' | ' + salary : jobName);
    if (companyName) lines.push('公司：' + companyName);
    var tagEls = cardEl.querySelectorAll('.job-tag, .tag-list li, .job-labels span');
    var tags = Array.from(tagEls).map(function(el) { return (el.textContent || '').trim(); }).filter(Boolean);
    if (tags.length) lines.push('标签：' + tags.join('、'));
    return lines.join('\n');
  }

  // ==================== JOB INFO EXTRACTION ====================

  function cleanNode(el) {
    if (!el) return '';
    if (el.nodeType === 3) return strip(el.textContent);
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'style' || tag === 'script') return '';
    if (!el.cloneNode) return strip(el.textContent || '');
    var clone = el.cloneNode(true);
    if (!clone.querySelectorAll) return strip(clone.textContent || '');
    clone.querySelectorAll('br').forEach(function (n) { n.replaceWith('\n'); });
    clone.querySelectorAll('style, script').forEach(function (n) { n.remove(); });
    clone.querySelectorAll('*').forEach(function (n) {
      try {
        var s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.fontSize) === 0) {
          n.remove();
          return;
        }
        var w = parseFloat(s.width), h = parseFloat(s.height);
        if ((w > 0 && w < 1) || (h > 0 && h < 1)) { n.remove(); return; }
      } catch (e) {}
      if (typeof n.className === 'string' && /^[A-Za-z]{6,}$/.test(n.className)) { n.remove(); }
    });
    return strip(clone.textContent);
  }

  function isAdText(text) {
    return /尊享|求职权益|VIP特权|会员特权|限时免费|立即领取|专属福利|求职保障/.test(text);
  }

  function extractRequirements(container) {
    var ctx = container || document;
    var experience = '';
    var education = '';

    var tagItems = Array.from(ctx.querySelectorAll('.tag-list li')).map(cleanNode).filter(Boolean).filter(function(t) { return !isAdText(t); });
    if (!tagItems.length) {
      tagItems = Array.from(ctx.querySelectorAll('.job-banner-info span, .job-banner-info li, .job-require-item')).map(cleanNode).filter(Boolean).filter(function(t) { return !isAdText(t); });
    }

    for (var i = 0; i < tagItems.length; i++) {
      var t = tagItems[i];
      if (!experience && /\d+.*年|应届|在校|经验不限|经验/.test(t)) { experience = t; }
      else if (!education && /本科|硕士|博士|大专|高中|中专|学历不限|及以上/.test(t)) { education = t; }
    }
    return { experience: experience, education: education };
  }

  function extractJobInfo(detailBox) {
    var box = detailBox || document.querySelector('.job-detail-box');
    if (!box) {
      return extractJobInfoFromPage();
    }
    var lines = [];
    var jobName = cleanNode(box.querySelector('.job-detail-info .job-name'));
    if (jobName) lines.push(jobName);

    var tags = Array.from(box.querySelectorAll('.tag-list li')).map(cleanNode).filter(function(t) { return t && !isAdText(t); });
    if (tags.length) lines.push(tags.join(' · '));

    var labels = Array.from(box.querySelectorAll('.job-label-list li')).map(cleanNode).filter(function(t) { return t && !isAdText(t); });
    if (labels.length) lines.push('关键词：' + labels.join('、'));

    var descEl = box.querySelector('.desc');
    if (descEl) {
      var descClone = descEl.cloneNode(true);
      descClone.querySelectorAll('style, script').forEach(function(n) { n.remove(); });
      descClone.querySelectorAll('*').forEach(function(n) {
        try {
          var s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.fontSize) === 0) { n.remove(); return; }
          var w = parseFloat(s.width), h = parseFloat(s.height);
          if ((w > 0 && w < 1) || (h > 0 && h < 1)) { n.remove(); return; }
        } catch(e) {}
        if (typeof n.className === 'string' && /^[A-Za-z]{6,}$/.test(n.className) && !n.className.startsWith('bp-')) { n.remove(); }
      });
      var descText = descClone.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      if (descText && descText.length > 5) {
        lines.push('');
        lines.push('职位描述：');
        lines.push(descText);
      }
    }

    var address = cleanNode(box.querySelector('.job-address-desc'));
    if (address) {
      lines.push('');
      lines.push('地址：' + address);
    }

    var bossNameEl = box.querySelector('.job-boss-info .name');
    var bossAttrEl = box.querySelector('.job-boss-info .boss-info-attr');
    if (bossNameEl) {
      var name = (bossNameEl.childNodes[0] && bossNameEl.childNodes[0].textContent || '').trim();
      var attr = bossAttrEl ? bossAttrEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (name) lines.push('\n招聘者：' + (attr ? name + ' · ' + attr : name));
    }

    return lines.join('\n');
  }

  function extractJobInfoFromPage() {
    var lines = [];
    var nameEl = document.querySelector('.info-primary .name h1');
    var salaryEl = document.querySelector('.info-primary .name .salary');
    var jobName = nameEl ? nameEl.textContent.trim() : '';
    var salary = salaryEl ? salaryEl.textContent.trim() : '';
    if (jobName) lines.push(salary ? jobName + ' | ' + salary : jobName);

    var metaItems = [];
    var cityEl = document.querySelector('.info-primary .text-city');
    var expEl = document.querySelector('.info-primary .text-experiece');
    var degreeEl = document.querySelector('.info-primary .text-degree');
    if (cityEl) metaItems.push(cityEl.textContent.trim());
    if (expEl) metaItems.push(expEl.textContent.trim());
    if (degreeEl) metaItems.push(degreeEl.textContent.trim());
    if (metaItems.length) lines.push(metaItems.join(' · '));

    var benefitEls = document.querySelectorAll('.job-primary .job-tags:not(.tag-all) span');
    var benefits = Array.from(new Set(Array.from(benefitEls).map(function(el) { return el.textContent.trim(); }).filter(Boolean)));
    if (benefits.length) lines.push('福利：' + benefits.join('、'));

    var keywordEls = document.querySelectorAll('.job-keyword-list li');
    var keywords = Array.from(keywordEls).map(function(el) { return cleanNode(el); }).filter(Boolean);
    if (keywords.length) lines.push('关键词：' + keywords.join('、'));

    var descEl = document.querySelector('.job-sec-text');
    if (descEl) {
      var descClone = descEl.cloneNode(true);
      descClone.querySelectorAll('style, script').forEach(function(n) { n.remove(); });
      descClone.querySelectorAll('*').forEach(function(n) {
        try {
          var s = getComputedStyle(n);
          if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.fontSize) === 0) { n.remove(); return; }
          var w = parseFloat(s.width), h = parseFloat(s.height);
          if ((w > 0 && w < 1) || (h > 0 && h < 1)) { n.remove(); return; }
        } catch(e) {}
        if (typeof n.className === 'string' && /^[A-Za-z]{6,}$/.test(n.className) && !n.className.startsWith('bp-')) { n.remove(); }
      });
      var descText = descClone.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      if (descText && descText.length > 5) {
        lines.push('');
        lines.push('职位描述：');
        lines.push(descText);
      }
    }

    var companyInfo = document.querySelector('.sider-company .company-info a[title]');
    var companyExtra = document.querySelectorAll('.sider-company > p:not(.title)');
    var companyLines = [];
    if (companyInfo) companyLines.push(companyInfo.getAttribute('title'));
    companyExtra.forEach(function(p) {
      var t = p.textContent.replace(/\s+/g, ' ').trim();
      if (t) companyLines.push(t);
    });
    if (companyLines.length) {
      lines.push('');
      lines.push('公司：' + companyLines.join(' | '));
    }

    var addressEl = document.querySelector('.location-address');
    if (addressEl) {
      lines.push('');
      lines.push('工作地址：' + addressEl.textContent.trim());
    }

    var bossNameEl = document.querySelector('.job-boss-info .name');
    var bossAttrEl = document.querySelector('.job-boss-info .boss-info-attr');
    if (bossNameEl) {
      var bossName = (bossNameEl.childNodes[0] && bossNameEl.childNodes[0].textContent || '').trim();
      var bossAttr = bossAttrEl ? bossAttrEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (bossName) lines.push('\n招聘者：' + (bossAttr ? bossName + ' · ' + bossAttr : bossName));
    }

    return lines.join('\n');
  }



  // ==================== COPY JOB INFO BUTTON ====================

  // SVG icons (same as original script's Z0 and Q0)
  var COPY_ICON = '<svg class="bp-icon-copy" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  var CHECK_ICON = '<svg class="bp-icon-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  // Copy button CSS (from original's J0)
  injectCSS(`
    .bp-copy-job-btn {
      position: relative; display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; background: #00a6a70a;
      border: 1px solid rgba(0,166,167,.18); border-radius: 6px;
      color: #00a6a7; font-size: 14px; cursor: pointer; text-decoration: none;
      -webkit-font-smoothing: antialiased; font-family: system-ui, -apple-system, "PingFang SC", sans-serif;
      margin: 16px 0; user-select: none;
    }
    .op-links .bp-copy-job-btn { margin-left: 24px; }
    .bp-copy-job-btn:hover { color: #008c8d; background: #00a6a71a; border-color: #00a6a74d; }
    .bp-copy-job-btn.bp-copied { color: #30d158; background: #30d1580f; border-color: #30d15840; }
    .bp-copy-job-btn .bp-icon-check { display: none; }
    .bp-copy-job-btn.bp-copied .bp-icon-copy { display: none; }
    .bp-copy-job-btn.bp-copied .bp-icon-check { display: inline-block; }
    .bp-copy-job-btn .bp-label-copied { display: none; }
    .bp-copy-job-btn.bp-copied .bp-label-default { display: none; }
    .bp-copy-job-btn.bp-copied .bp-label-copied { display: inline; }
  `);

  function createCopyJobBtn() {
    var btn = document.createElement('a');
    btn.className = 'bp-copy-job-btn bp-pressable';
    btn.href = 'javascript:;';
    btn.innerHTML = '<span class="bp-copy-job-icon">' + COPY_ICON + CHECK_ICON + '</span>'
      + '<span class="bp-copy-job-label">'
      + '<span class="bp-label-default">复制岗位信息</span>'
      + '<span class="bp-label-copied">已复制</span>'
      + '</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleCopyJobInfo(btn);
    });
    return btn;
  }

  function handleCopyJobInfo(btn) {
    if (btn.classList.contains('bp-copied')) return;
    var box = btn.closest('.job-detail-box');
    var text = box ? extractJobInfo(box) : extractJobInfoFromPage();
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.classList.add('bp-copied');
      setTimeout(function () { btn.classList.remove('bp-copied'); }, 2000);
    });
  }

  function injectCopyBtn() {
    // Already injected somewhere
    if (document.querySelector('.bp-copy-job-btn')) return;

    var btn = createCopyJobBtn();

    // Position 1: job detail page action bar
    var opLinks = document.querySelector('.job-detail-section .detail-section-operate .op-links')
      || document.querySelector('.detail-section-operate .op-links')
      || document.querySelector('.op-links');
    if (opLinks) {
      opLinks.appendChild(btn);
      return;
    }
    // Position 2: after keyword/label list in detail panel
    var labelList = document.querySelector('.job-label-list')
      || document.querySelector('.job-keyword-list');
    if (labelList) {
      labelList.insertAdjacentElement('afterend', btn);
      return;
    }
    // Position 3: inside job-detail-box anywhere
    var detailBox = document.querySelector('.job-detail-box');
    if (detailBox) {
      var header = detailBox.querySelector('.job-detail-info')
        || detailBox.querySelector('.detail-header')
        || detailBox.querySelector('.job-detail-header');
      if (header) {
        header.appendChild(btn);
        return;
      }
      detailBox.appendChild(btn);
    }
  }

  function setupCopyBtnObserver() {
    injectCopyBtn();
    new MutationObserver(function () { injectCopyBtn(); }).observe(document.body, { childList: true, subtree: true });
  }

  // ==================== DEBUG/TEST MODE ====================
  // 独立于自动投递流程，仅生成招呼语用于测试 Prompt 效果
  // 不会触发「立即沟通」、不会跳转聊天页、不会发送给 HR

  var DEBUG_STORAGE_KEY = 'bpe_debug_results';
  var debugActiveCount = 0;  // 并行生成中的数量

  function getDebugResults() {
    try { return JSON.parse(localStorage.getItem(DEBUG_STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function addDebugResult(jd, greeting) {
    var results = getDebugResults();
    results.push({ jd: jd, greeting: greeting, time: new Date().toISOString() });
    localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(results));
    updateDebugPanel();
    return results.length;
  }

  function clearDebugResults() {
    localStorage.removeItem(DEBUG_STORAGE_KEY);
    updateDebugPanel();
    showToast('调试数据已清空', 'info');
  }

  function exportDebugCsv() {
    var results = getDebugResults();
    if (!results.length) {
      showToast('暂无调试数据可导出', 'warn');
      return;
    }
    var BOM = '﻿';
    var header = 'JD,招呼语';
    var rows = results.map(function (r) {
      var safeJd = String(r.jd || '').replace(/"/g, '""');
      var safeGr = String(r.greeting || '').replace(/"/g, '""');
      return '"' + safeJd + '","' + safeGr + '"';
    });
    var csv = BOM + header + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'boss-debug-greetings.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    showToast('已导出 ' + results.length + ' 条调试记录', 'success');
  }

  // --- Debug Generate (independent of auto-apply) ---

  var DEBUG_BTN_HTML = '<span class="bpe-debug-icon">🧪</span><span>调试生成</span>';

  async function handleDebugGenerate(btn) {
    if (btn.classList.contains('bpe-debug-loading')) return;

    var box = btn.closest('.job-detail-box');
    var jd = box ? extractJobInfo(box) : extractJobInfoFromPage();
    if (!jd || jd.length < 10) {
      showToast('未提取到有效岗位信息', 'warn');
      return;
    }

    // Extract job name for identification
    var jobName = (jd.split('\n')[0] || '').trim() || '(未知岗位)';

    // Filter check: whitelist / blacklist / salary
    var filterResult = checkJobFilters(jd, jobName);
    if (!filterResult.pass) {
      showToast('过滤未通过: ' + filterResult.reason, 'warn');
      return;
    }

    btn.classList.add('bpe-debug-loading');
    btn.innerHTML = '<span>⏳ 生成中...</span>';

    debugActiveCount++;
    updateDebugPanel();

    var apiError = null;
    var greeting = null;
    try {
      greeting = await callDeepSeekForGreeting(jd);
      // Capture error immediately after await to avoid race on shared lastApiError
      if (!greeting) apiError = lastApiError || '未知错误';
    } catch (e) {
      apiError = (e.message || String(e)).substring(0, 300);
    }

    debugActiveCount--;
    updateDebugPanel();

    // Update button only if it's still in the DOM (user may have navigated away)
    if (btn.isConnected) {
      btn.classList.remove('bpe-debug-loading');
      btn.innerHTML = DEBUG_BTN_HTML;
    }

    if (!greeting) {
      showToast('「' + jobName + '」生成失败: ' + (apiError || '未知错误'), 'error');
      return;
    }

    // B1: Validate greeting quality, retry once if invalid
    var quality = validateGreetingQuality(greeting);
    if (!quality.valid) {
      showToast('招呼语质量异常，自动重试: ' + quality.issues[0], 'warn');
      var retryGreeting = null;
      try {
        retryGreeting = await callDeepSeekForGreeting(jd);
      } catch (e) {}
      if (retryGreeting) {
        var retryQuality = validateGreetingQuality(retryGreeting);
        if (retryQuality.valid) {
          greeting = retryGreeting;
          showToast('重试后招呼语质量通过', 'success');
        } else {
          showToast('重试后仍异常，使用原始招呼语', 'warn');
        }
      }
    }

    var count = addDebugResult(jd, greeting);
    showToast('「' + jobName + '」招呼已生成 ✓ 累计 ' + count + ' 条', 'success');

    // B5: Analyze which experiences were likely matched
    var matchResult = analyzeExperienceMatch(jd);

    // Show preview in log panel
    if (!logPanel) { logPanel = createLogPanel('调试预览'); }
    logPanel.show();
    logPanel.log('【' + jobName + '】', 'info');
    logPanel.log('「' + jd.substring(0, 80).replace(/\n/g, ' ') + '...」', 'info');
    logPanel.log('招呼语：' + greeting, 'info');
    if (matchResult.length > 0) {
      var topMatches = matchResult.slice(0, 5);
      logPanel.log('--- 经验匹配分析（关键词命中） ---', 'info');
      for (var mi = 0; mi < topMatches.length; mi++) {
        var m = topMatches[mi];
        logPanel.log((mi + 1) + '. [' + m.weight + '] ' + m.role + ' | ' + m.company + ' (关键词命中' + m.score + '个)', 'info');
      }
    }
  }

  // --- Debug Button on Detail Panel ---

  function createDebugBtn() {
    var btn = document.createElement('a');
    btn.className = 'bp-copy-job-btn bpe-debug-btn';
    btn.href = 'javascript:;';
    btn.innerHTML = DEBUG_BTN_HTML;
    btn.setAttribute('title', '仅生成招呼语（不会发送给HR）');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleDebugGenerate(btn);
    });
    return btn;
  }

  function injectDebugBtns() {
    if (document.querySelector('.bpe-debug-btn')) return;

    var btn = createDebugBtn();

    // Place near the copy button
    var opLinks = document.querySelector('.job-detail-section .detail-section-operate .op-links')
      || document.querySelector('.detail-section-operate .op-links')
      || document.querySelector('.op-links');
    if (opLinks) {
      opLinks.appendChild(btn);
      return;
    }
    var labelList = document.querySelector('.job-label-list') || document.querySelector('.job-keyword-list');
    if (labelList) {
      labelList.insertAdjacentElement('afterend', btn);
      return;
    }
    var detailBox = document.querySelector('.job-detail-box');
    if (detailBox) {
      var header = detailBox.querySelector('.job-detail-info')
        || detailBox.querySelector('.detail-header')
        || detailBox.querySelector('.job-detail-header');
      if (header) { header.appendChild(btn); return; }
      detailBox.appendChild(btn);
    }
  }

  function setupDebugBtnObserver() {
    injectDebugBtns();
    new MutationObserver(function () { injectDebugBtns(); }).observe(document.body, { childList: true, subtree: true });
  }

  // --- Debug Floating Panel (export/clear) ---

  injectCSS('\n'
    + '.bpe-debug-panel {\n'
    + '  position: fixed; right: 20px; bottom: 180px; z-index: 10000;\n'
    + '  background: #fff; border: 1px solid #e5e5e5; border-radius: 12px;\n'
    + '  box-shadow: 0 4px 20px rgba(0,0,0,.1); padding: 14px 16px;\n'
    + '  display: none; flex-direction: column; gap: 8px; min-width: 170px;\n'
    + '  font-family: system-ui, -apple-system, "PingFang SC", sans-serif;\n'
    + '}\n'
    + '.bpe-debug-panel.bpe-visible { display: flex; }\n'
    + '.bpe-debug-panel .bpe-debug-count {\n'
    + '  font-size: 13px; color: #333; text-align: center; font-weight: 600;\n'
    + '}\n'
    + '.bpe-debug-panel .bpe-debug-count span { color: #00a6a7; }\n'
    + '.bpe-debug-panel button {\n'
    + '  padding: 6px 12px; border-radius: 6px; border: 1px solid #ddd;\n'
    + '  cursor: pointer; font-size: 12px; font-family: inherit; background: #f5f5f5;\n'
    + '  transition: all .15s;\n'
    + '}\n'
    + '.bpe-debug-panel .bpe-debug-export {\n'
    + '  background: #00a6a7; color: #fff; border-color: #00a6a7;\n'
    + '}\n'
    + '.bpe-debug-panel .bpe-debug-export:hover { background: #008c8d; }\n'
    + '.bpe-debug-panel .bpe-debug-clear:hover { background: #ffe5e5; border-color: #ffcccc; color: #c00; }\n'
    + '.bpe-debug-btn.bpe-debug-loading { opacity: .6; pointer-events: none; }\n'
  );

  function createDebugPanel() {
    if (document.getElementById('bpe-debug-panel')) return;
    var panel = document.createElement('div');
    panel.className = 'bpe-debug-panel';
    panel.id = 'bpe-debug-panel';
    panel.innerHTML = '<div class="bpe-debug-count" id="bpe-debug-active-msg" style="display:none">⏳ 生成中: <span id="bpe-debug-active-num">0</span> 条</div>'
      + '<div class="bpe-debug-count">已完成: <span id="bpe-debug-count-num">0</span> 条</div>'
      + '<button class="bpe-debug-export" id="bpe-debug-export-btn">📥 导出 Excel (CSV)</button>'
      + '<button class="bpe-debug-clear" id="bpe-debug-clear-btn">🗑 清空记录</button>';
    document.body.appendChild(panel);

    document.getElementById('bpe-debug-export-btn').addEventListener('click', exportDebugCsv);
    document.getElementById('bpe-debug-clear-btn').addEventListener('click', clearDebugResults);
  }

  function updateDebugPanel() {
    var panel = document.getElementById('bpe-debug-panel');
    if (!panel) { createDebugPanel(); panel = document.getElementById('bpe-debug-panel'); }
    var results = getDebugResults();
    var countEl = document.getElementById('bpe-debug-count-num');
    if (countEl) countEl.textContent = results.length;
    var activeEl = document.getElementById('bpe-debug-active-num');
    if (activeEl) activeEl.textContent = debugActiveCount;
    var activeMsg = document.getElementById('bpe-debug-active-msg');
    if (activeMsg) activeMsg.style.display = debugActiveCount > 0 ? '' : 'none';
    if (results.length > 0 || debugActiveCount > 0) {
      panel.classList.add('bpe-visible');
    } else {
      panel.classList.remove('bpe-visible');
    }
  }

  // --- Send Greeting Button (正式模式：直接生成招呼语并发送) ---

  var SKIP_FILTER_BTN_HTML = '<span class="bpe-debug-icon">⚡</span><span>发送招呼</span>';

  function createSkipFilterBtn() {
    var btn = document.createElement('a');
    btn.className = 'bp-copy-job-btn bpe-skip-filter-btn';
    btn.href = 'javascript:;';
    btn.innerHTML = SKIP_FILTER_BTN_HTML;
    btn.setAttribute('title', '直接生成招呼语并发送');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleSkipFilter(btn);
    });
    return btn;
  }

  async function handleSkipFilter(btn) {
    if (btn.classList.contains('bpe-debug-loading')) return;

    var box = btn.closest('.job-detail-box');
    var jd = box ? extractJobInfo(box) : extractJobInfoFromPage();
    if (!jd || jd.length < 10) {
      showToast('未提取到有效岗位信息', 'warn');
      return;
    }

    var jobName = (jd.split('\n')[0] || '').trim() || '(未知岗位)';

    btn.classList.add('bpe-debug-loading');
    btn.innerHTML = '<span>⏳ 生成中...</span>';

    var apiError = null;
    var greeting = null;
    try {
      greeting = await callDeepSeekForGreeting(jd);
      if (!greeting) apiError = lastApiError || '未知错误';
    } catch (e) {
      apiError = (e.message || String(e)).substring(0, 300);
    }

    // Restore button if still connected
    if (btn.isConnected) {
      btn.classList.remove('bpe-debug-loading');
      btn.innerHTML = SKIP_FILTER_BTN_HTML;
    }

    if (!greeting) {
      showToast('「' + jobName + '」生成失败: ' + (apiError || '未知错误'), 'error');
      return;
    }

    // B1: Validate greeting quality, retry once if invalid
    var config = getConfig();
    if (config.validateGreeting) {
      var quality = validateGreetingQuality(greeting);
      if (!quality.valid) {
        showToast('招呼语质量异常，自动重试: ' + quality.issues[0], 'warn');
        btn.classList.add('bpe-debug-loading');
        btn.innerHTML = '<span>⏳ 重试中...</span>';
        try {
          var retryGreeting = await callDeepSeekForGreeting(jd);
          if (retryGreeting) {
            var retryQuality = validateGreetingQuality(retryGreeting);
            if (retryQuality.valid) {
              greeting = retryGreeting;
            }
          }
        } catch (e) {}
        if (btn.isConnected) {
          btn.classList.remove('bpe-debug-loading');
          btn.innerHTML = SKIP_FILTER_BTN_HTML;
        }
      }
    }

    // Find "立即沟通" button
    var chatBtn = box ? box.querySelector('.op-btn-chat') : document.querySelector('.op-btn-chat');
    if (!chatBtn) {
      showToast('未找到「立即沟通」按钮', 'error');
      return;
    }

    // Save pending state for chat page handler
    // lastUnfilteredIdx: null ensures init() won't auto-resume after returning
    sessionStorage.setItem('bpe_pending', JSON.stringify({
      greeting: greeting,
      jobName: jobName,
      company: '',
      listUrl: location.href,
      applyCount: 0,
      lastUnfilteredIdx: null,
      limit: 0
    }));

    showToast('正在跳转发送...', 'info');
    await simulateMouseMove(chatBtn);
    await sleep(100, 300);
    var rect = chatBtn.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    chatBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
    chatBtn.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
    chatBtn.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
  }

  function injectSkipFilterBtn() {
    if (document.querySelector('.bpe-skip-filter-btn')) return;

    var btn = createSkipFilterBtn();
    var debugBtn = document.querySelector('.bpe-debug-btn');

    // Insert before debug button if exists, otherwise append to op-links
    if (debugBtn && debugBtn.parentNode) {
      debugBtn.parentNode.insertBefore(btn, debugBtn);
      return;
    }

    var opLinks = document.querySelector('.job-detail-section .detail-section-operate .op-links')
      || document.querySelector('.detail-section-operate .op-links')
      || document.querySelector('.op-links');
    if (opLinks) {
      // Append after copy button (before debug button if it gets added later)
      var copyBtn = opLinks.querySelector('.bp-copy-job-btn:not(.bpe-debug-btn):not(.bpe-skip-filter-btn)');
      if (copyBtn && copyBtn.nextSibling) {
        copyBtn.parentNode.insertBefore(btn, copyBtn.nextSibling);
      } else {
        opLinks.appendChild(btn);
      }
      return;
    }
  }

  function setupSkipFilterObserver() {
    injectSkipFilterBtn();
    new MutationObserver(function () { injectSkipFilterBtn(); }).observe(document.body, { childList: true, subtree: true });
  }

  function initDebugMode() {
    createDebugPanel();
    updateDebugPanel();
    setupDebugBtnObserver();
  }

  // ==================== CHAT TAB HANDLER ====================

  function isChatPage() {
    return location.pathname.startsWith('/web/geek/chat');
  }

  function findChatInput(timeoutMs) {
    var selectors = [
      'textarea',
      '[class*="chat"] textarea',
      '[class*="input"] textarea',
      '[class*="message"] textarea',
      '[class*="editor"] textarea',
      '.chat-input textarea',
      '.input-area textarea',
      '[contenteditable="true"].chat-input',
      '[contenteditable="true"][class*="input"]',
      '[contenteditable="true"][class*="message"]',
      'div[placeholder*="消息"]',
      'div[placeholder*="输入"]'
    ];
    var deadline = Date.now() + (timeoutMs || 15000);
    return new Promise(function (resolve) {
      function tryFind(attempts) {
        for (var i = 0; i < selectors.length; i++) {
          var el = document.querySelector(selectors[i]);
          if (el && el.offsetParent !== null) {
            resolve(el);
            return;
          }
        }
        if (Date.now() < deadline && attempts < 50) {
          setTimeout(function () { tryFind(attempts + 1); }, 500);
        } else {
          resolve(null);
        }
      }
      tryFind(0);
    });
  }

  function setInputValue(el, text) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      var nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
        || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable
      el.textContent = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    el.focus();
  }

  function selectFirstConversation() {
    var item = document.querySelector('.user-list ul[role="group"] li[role="listitem"]')
      || document.querySelector('[role="listitem"]')
      || document.querySelector('[class*="chat-list"] [class*="item"]')
      || document.querySelector('[class*="conversation"] [class*="item"]')
      || document.querySelector('[class*="list-item"]')
      || document.querySelector('li[class*="contact"]');
    if (item) {
      var nameEl = item.querySelector('.name-text') || item.querySelector('[class*="name"]');
      var convName = nameEl ? (nameEl.textContent || '').trim() : '(未知)';
      item.click();
      return convName;
    }
    return null;
  }

  async function handleChatPageGreeting() {
    if (!isChatPage()) return false;

    var raw = sessionStorage.getItem('bpe_pending');
    if (!raw) return false;
    sessionStorage.removeItem('bpe_pending');

    var state;
    try { state = JSON.parse(raw); } catch (e) { return false; }
    if (!state || !state.greeting) return false;

    var convName = null;
    for (var retry = 0; retry < 10; retry++) {
      await sleep(1500, 2000);
      convName = selectFirstConversation();
      if (convName) break;
    }
    if (!convName) {
      location.href = state.listUrl || '/web/geek/jobs';
      return false;
    }
    await sleep(2000, 3000);

    var input = await findChatInput(20000);
    if (!input) {
      location.href = state.listUrl || '/web/geek/jobs';
      return false;
    }

    setInputValue(input, state.greeting);
    await sleep(500, 1000);

    var sendBtn = document.querySelector('.send-btn')
      || document.querySelector('[class*="send"] button')
      || document.querySelector('button[class*="send"]');
    if (!sendBtn) {
      var allBtns = document.querySelectorAll('button');
      for (var i = 0; i < allBtns.length; i++) {
        var t = (allBtns[i].textContent || '').trim();
        if (t === '发送' || t === 'Send') { sendBtn = allBtns[i]; break; }
      }
    }
    if (sendBtn) {
      sendBtn.click();
      await sleep(1500, 2500);
    }

    // Save resume state for the list page
    sessionStorage.setItem('bpe_resume', JSON.stringify({
      lastUnfilteredIdx: state.lastUnfilteredIdx,
      applyCount: (state.applyCount || 0) + 1,
      limit: state.limit || 0,
      listUrl: state.listUrl,
    }));

    // Pre-generate next greeting during idle time on chat page
    var pregenTriggered = false;
    try {
      var pregenRaw = sessionStorage.getItem('bpe_pregen_task');
      if (pregenRaw) {
        sessionStorage.removeItem('bpe_pregen_task');
        var pregenTask = JSON.parse(pregenRaw);
        if (pregenTask && pregenTask.jobInfo) {
          pregenTriggered = true;
          callDeepSeekForGreeting(pregenTask.jobInfo).then(function (g) {
            if (g) {
              sessionStorage.setItem('bpe_cached_greeting', JSON.stringify({ greeting: g }));
            }
          });
        }
      }
    } catch (e) {}

    // A4: Smart delay between jobs
    var delaySec = getSmartDelaySeconds();
    log('等待 ' + delaySec + ' 秒后返回列表...' + (pregenTriggered ? '（后台预生成下一招呼语）' : ''), 'info');
    await sleep(delaySec * 1000);

    if (state.listUrl) {
      location.href = state.listUrl;
    } else {
      history.go(-2);
    }
    return true;
  }


  // ==================== LIST PAGE AUTO APPLY ====================

  var isRunning = false;
  var applyCount = 0;
  var logPanel = null;
  var pendingJob = null; // {companyName, jobName} waiting for DeepSeek

  function log(msg, type) {
    if (logPanel) logPanel.log(msg, type);
    console.log('[BPE] ' + msg);
  }

  function checkSkipFlag() {
    if (window._bpe_skip_current) {
      window._bpe_skip_current = false;
      log('用户跳过当前岗位，进入下一个', 'warn');
      return true;
    }
    return false;
  }

  function isListPage() {
    return location.pathname.startsWith('/web/geek/jobs');
  }

  function getJobCards() {
    var list = document.querySelector('.rec-job-list');
    if (!list) return [];
    return Array.from(list.querySelectorAll('.card-area')).filter(function (card) {
      return getComputedStyle(card).display !== 'none';
    });
  }

  async function startAutoApply(resumeState) {
    if (isRunning) return false;
    isRunning = true;
    updateApplyButton();
    applyCount = resumeState ? (resumeState.applyCount || 0) : 0;
    pendingJob = null;
    if (!resumeState) sessionStorage.removeItem('bpe_refresh_count');

    var limit = resumeState ? (resumeState.limit || 0) : getConfig().applyLimit;
    var startIdx = resumeState ? (resumeState.lastUnfilteredIdx || 0) : 0;

    if (!logPanel) {
      logPanel = createLogPanel('自动投递日志');
    }
    logPanel.show();
    logPanel.setActive(true);
    logPanel.updateCount(applyCount, limit);
    if (!resumeState) logPanel.clear();

    log(resumeState ? '自动投递已恢复' : '自动投递已启动', 'info');
    if (limit > 0) log('单次投递上限: ' + limit, 'info');

    try {
      if (!isListPage()) {
        log('正在跳转到职位列表...', 'info');
        location.href = 'https://www.zhipin.com/web/geek/jobs';
        return true;
      }
      await runAutoApplyLoop(limit, startIdx);
    } catch (e) {
      log('错误: ' + e.message, 'error');
      playErrorSound();
    } finally {
      stopAutoApply(false);
    }
    return true;
  }

  async function runAutoApplyLoop(limit, startIdx) {
    var lastUnfilteredIdx = startIdx || 0;
    var config = getConfig();

    // A3: Preload job cards by scrolling
    log('正在加载职位列表...', 'info');
    await preloadJobCards();
    log('职位卡片加载完成', 'info');

    // After page refresh, switch to target expectation
    if (sessionStorage.getItem('bpe_switch_expect') === '1') {
      sessionStorage.removeItem('bpe_switch_expect');
      await switchToTargetExpect();
    }

    while (isRunning) {
      if (!isRunning) break;

      if (limit > 0 && applyCount >= limit) {
        log('已完成投递上限 (' + limit + ')', 'info');
        playCompleteSound();
        stopAutoApply(false);
        break;
      }

      // Wait for pending DeepSeek call to finish
      if (pendingJob) {
        await sleep(2000, 3000);
        continue;
      }

      var cards = getJobCards();
      if (cards.length === 0) {
        // After communication, BOSS removes cards from DOM.
        // If we already processed cards on this page, fall through
        // to the refresh logic instead of retrying forever.
        if (lastUnfilteredIdx > 0) {
          log('职位列表已清空（卡片被移除），准备刷新页面...', 'info');
        } else {
          log('未找到职位列表，3秒后重试...', 'warn');
          await sleep(3000, 5000);
          continue;
        }
      }

      var targetCard = null;
      var targetIdx = -1;

      for (var i = lastUnfilteredIdx; i < cards.length; i++) {
        var card = cards[i];
        var companyName = (card.querySelector('.boss-name') || {}).textContent || '';
        companyName = companyName.trim();
        var jobName = (card.querySelector('.job-name') || {}).textContent || '未知职位';
        jobName = jobName.trim();

        if (config.skipCommunicated && isCompanyBlocked(companyName)) {
          log('跳过屏蔽公司: ' + companyName + ' — ' + jobName, 'warn');
          continue;
        }

        targetCard = card;
        targetIdx = i;
        break;
      }

      if (!targetCard) {
        var refreshCount = (parseInt(sessionStorage.getItem('bpe_refresh_count'), 10) || 0) + 1;
        var maxRefreshes = config.refreshLimit || 0;
        if (maxRefreshes > 0 && refreshCount <= maxRefreshes && (limit === 0 || applyCount < limit)) {
          log('当前列表已遍历完毕，第 ' + refreshCount + ' 次刷新页面继续...', 'info');
          sessionStorage.setItem('bpe_refresh_count', String(refreshCount));
          sessionStorage.setItem('bpe_resume', JSON.stringify({
            lastUnfilteredIdx: 0,
            applyCount: applyCount,
            limit: limit,
            listUrl: location.href,
          }));
          sessionStorage.setItem('bpe_switch_expect', '1');
          location.reload();
          return;
        }
        sessionStorage.removeItem('bpe_refresh_count');
        log('当前列表岗位已全部过滤，自动投递已停止', 'warn');
        stopAutoApply();
        break;
      }

      lastUnfilteredIdx = targetIdx + 1;

      var jobNameEl = targetCard.querySelector('.job-name');
      var cardJobName = jobNameEl ? (jobNameEl.textContent || '').trim() : '未知职位';
      var cardCompanyName = (targetCard.querySelector('.boss-name') || {}).textContent || '';
      cardCompanyName = cardCompanyName.trim();

      log('正在处理: ' + cardJobName + ' — ' + cardCompanyName, 'info');

      // Click card to open detail in-page
      if (checkSkipFlag()) continue;
      targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(400, 800);
      await simulateClick(jobNameEl);
      await sleep(1500, 3000);

      // Wait for detail panel to load
      try {
        await waitFor('.job-detail-box', 10000);
      } catch (e) {
        log('岗位详情加载超时: ' + cardJobName, 'warn');
        continue;
      }
      await sleep(500, 1000);

      var detailBox = document.querySelector('.job-detail-box');
      if (!detailBox) {
        log('未找到岗位详情面板', 'warn');
        continue;
      }

      // Extract JD
      var jobInfo = extractJobInfo(detailBox);
      if (!jobInfo || jobInfo.length < 20) {
        log('岗位信息提取不完整', 'warn');
        continue;
      }

      // Filter check: whitelist / blacklist / salary
      var filterResult = checkJobFilters(jobInfo, cardJobName);
      if (!filterResult.pass) {
        log('过滤：' + filterResult.reason + ' — ' + cardJobName, 'warn');
        continue;
      }

      // AI semantic filter
      if (config.enableAIFilter) {
        log('AI语义匹配中...', 'info');
        var aiResult = await checkAIFilter(jobInfo, cardJobName);
        if (!aiResult.pass) {
          log('AI过滤：' + aiResult.reason + ' — ' + cardJobName, 'warn');
          continue;
        }
        if (aiResult.aiScore !== undefined) {
          log('AI匹配度：' + (aiResult.aiScore * 100).toFixed(0) + '% — ' + cardJobName, 'info');
        }
      }

      // A5: Recruiter activity check (完全复制源程序 De() 逻辑)
      if (config.skipInactiveRecruiter) {
        var allowed = config.allowedRecruiterStatuses || [];
        if (allowed.length > 0) {
          var activity = parseRecruiterActivity(detailBox);
          if (!activity) {
            log('未找到招聘者活跃状态，跳过: ' + cardJobName, 'warn');
            continue;
          }
          if (allowed.indexOf(activity.key) === -1) {
            log('招聘者活跃度不匹配(' + activity.text + '): ' + cardJobName, 'warn');
            continue;
          }
        }
      }

      // Find "立即沟通" button
      var chatBtn = detailBox.querySelector('.op-btn-chat');
      if (!chatBtn) {
        log('未找到立即沟通按钮', 'warn');
        continue;
      }
      var btnText = (chatBtn.textContent || '').replace(/\s+/g, '');
      if (btnText !== '立即沟通') {
        log('该岗位已沟通过(' + btnText + ')，跳过', 'warn');
        continue;
      }

      // Step 1: Call DeepSeek FIRST (before opening chat)
      if (checkSkipFlag()) continue;
      log('正在生成招呼语...', 'info');
      pendingJob = { company: cardCompanyName, job: cardJobName };

      // Check for pre-generated greeting from chat page idle time
      var greeting = null;
      var cachedRaw = sessionStorage.getItem('bpe_cached_greeting');
      if (cachedRaw) {
        sessionStorage.removeItem('bpe_cached_greeting');
        try {
          var cached = JSON.parse(cachedRaw);
          if (cached && cached.greeting) {
            greeting = cached.greeting;
            log('命中预生成招呼语缓存', 'info');
          }
        } catch (e) {}
      }
      if (!greeting) {
        greeting = await callDeepSeekForGreeting(jobInfo);
      }

      if (!isRunning) { pendingJob = null; break; }
      if (checkSkipFlag()) { pendingJob = null; continue; }

      if (!greeting) {
        log('API 调用失败「' + cardCompanyName + ' — ' + cardJobName + '」: ' + (lastApiError || '未知错误'), 'error');
        pendingJob = null;
        continue;
      }

      // B1: Validate greeting quality, retry once if invalid
      if (config.validateGreeting) {
        var quality = validateGreetingQuality(greeting);
        if (!quality.valid) {
          log('招呼语质量异常，自动重试: ' + quality.issues.join('; '), 'warn');
          if (checkSkipFlag()) { pendingJob = null; continue; }
          var retryGreeting = await callDeepSeekForGreeting(jobInfo);
          if (retryGreeting) {
            var retryQuality = validateGreetingQuality(retryGreeting);
            if (retryQuality.valid) {
              greeting = retryGreeting;
              log('重试后招呼语质量通过', 'info');
            } else {
              log('重试后仍异常: ' + retryQuality.issues.join('; ') + '，使用原始招呼语', 'warn');
            }
          } else {
            log('重试 API 调用失败，使用原始招呼语', 'warn');
          }
        }
      }

      // Step 2: Save state + greeting to sessionStorage, then click "立即沟通".
      if (checkSkipFlag()) { pendingJob = null; continue; }
      // Page navigates to chat page (same tab). The chat page handler
      // (handleChatPageGreeting) reads state, pastes greeting, increments
      // applyCount, saves bpe_resume, and navigates back to listUrl.
      // On return, init() detects bpe_resume and resumes the loop.
      // Pre-generate next greeting: store next card's basic info for chat page idle time
      try {
        var cards = getJobCards();
        var nextIdx = -1;
        for (var k = lastUnfilteredIdx + 1; k < cards.length; k++) {
          var nc = cards[k];
          var ncCompany = ((nc.querySelector('.boss-name') || {}).textContent || '').trim();
          if (!config.skipCommunicated || !isCompanyBlocked(ncCompany)) {
            nextIdx = k;
            break;
          }
        }
        if (nextIdx >= 0) {
          var nextJobInfo = extractCardBasicInfo(cards[nextIdx]);
          if (nextJobInfo && nextJobInfo.length >= 10) {
            sessionStorage.setItem('bpe_pregen_task', JSON.stringify({
              jobInfo: nextJobInfo,
              nextIdx: nextIdx,
            }));
          }
        }
      } catch (e) {}

      sessionStorage.setItem('bpe_pending', JSON.stringify({
        lastUnfilteredIdx: lastUnfilteredIdx,
        applyCount: applyCount,
        greeting: greeting,
        jobName: cardJobName,
        company: cardCompanyName,
        listUrl: location.href,
        limit: limit,
      }));

      // Click "立即沟通" - triggers API call + SPA navigation
      await simulateMouseMove(chatBtn);
      await sleep(100, 300);
      var rect = chatBtn.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      chatBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
      chatBtn.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
      chatBtn.dispatchEvent(new MouseEvent('click',     { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));

      // Page will navigate away — execution stops here.
      // The chat page handler takes over from this point.
      return;
    }
  }

  function stopAutoApply(playSound) {
    if (!isRunning) return;
    isRunning = false;
    window._bpe_skip_current = false;
    if (logPanel) {
      logPanel.setActive(false);
      log('自动投递已停止', 'warn');
    }
    if (playSound !== false) playErrorSound();
    updateApplyButton();
  }

  function toggleAutoApply() {
    if (isRunning) {
      stopAutoApply();
    } else {
      startAutoApply();
    }
  }

  // ==================== SETTINGS PANEL ====================

  function openSettings() {
    _settingsDirty = true;
    var config = getConfig();
    var blockedCompanies = getBlockedCompanies();
    var _workingConfig = JSON.parse(JSON.stringify(config));
    var _workingBlocked = JSON.parse(JSON.stringify(blockedCompanies));
    const saved = {};

    // Override getters to use working copies during settings session
    var _origGetBlockedCompanies = getBlockedCompanies;
    var _origGetConfig = getConfig;
    getBlockedCompanies = function () { return _workingBlocked; };
    getConfig = function () { return _workingConfig; };
    config = _workingConfig;
    blockedCompanies = _workingBlocked;

    // Build recruiter status checkboxes HTML
    var recruiterStatusesHtml = '';
    var allowedStatuses = config.allowedRecruiterStatuses || [];
    for (var si = 0; si < RECRUITER_STATUS_ORDER.length; si++) {
      var key = RECRUITER_STATUS_ORDER[si];
      var label = RECRUITER_STATUS_LABELS[key];
      var checked = allowedStatuses.indexOf(key) !== -1 ? 'checked' : '';
      recruiterStatusesHtml += '<label class="bpe-multiselect-option">'
        + '<input type="checkbox" class="bpe-recruiter-status" value="' + key + '" ' + checked + '>'
        + label + '</label>';
    }

    // Build all HTML in one string (content + footer)
    const html = `
      <div class="bpe-settings-group">
        <div>
          <div class="bpe-settings-label"><span>DeepSeek API Key</span></div>
          <p class="bpe-settings-desc">密钥保存在本地存储，不会上传</p>
          <input class="bpe-input" type="password" id="bpe-api-key" value="${escapeHTML(config.deepseekApiKey || GM_getValue('deep_api_key', '') || '')}" placeholder="sk-..." style="margin-top:8px;">
        </div>
        <div class="bpe-settings-label">
          <div><span>自动跳过屏蔽公司</span><p class="bpe-settings-desc">开启后在自动投递时跳过黑名单中的公司</p></div>
          <label class="bpe-toggle"><input type="checkbox" id="bpe-skip-company" ${config.skipCommunicated ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div>
          <div style="display:flex;gap:24px;align-items:flex-start;">
            <div style="flex:1;">
              <div class="bpe-settings-label"><span>单次投递上限</span></div>
              <p class="bpe-settings-desc">达到后自动暂停，设为 0 不限制</p>
              <input class="bpe-input" type="number" id="bpe-apply-limit" value="${config.applyLimit}" min="0" max="150" style="width:100px;margin-top:8px;">
            </div>
            <div style="flex:1;">
              <div class="bpe-settings-label"><span>刷新次数</span></div>
              <p class="bpe-settings-desc">列表遍历完后自动刷新翻页上限</p>
              <input class="bpe-input" type="number" id="bpe-refresh-limit" value="${config.refreshLimit || 3}" min="0" max="20" style="width:100px;margin-top:8px;">
            </div>
          </div>
        </div>
        <div>
          <div class="bpe-settings-label"><span>岗位间休息时长（秒）</span></div>
          <p class="bpe-settings-desc">每投完一个岗位后随机休息</p>
          <div class="bpe-range-row" style="margin-top:8px;">
            <input class="bpe-number-input" type="number" id="bpe-interval-min" value="${config.applyIntervalMin}" min="1" max="120">
            <span>至</span>
            <input class="bpe-number-input" type="number" id="bpe-interval-max" value="${config.applyIntervalMax}" min="1" max="120">
            <span>秒</span>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div class="bpe-settings-label">
          <div><span>招聘者活跃度过滤</span><p class="bpe-settings-desc">仅向以下活跃状态的招聘者投递（勾选准入，不勾选则全部放行）</p></div>
          <label class="bpe-toggle"><input type="checkbox" id="bpe-recruiter-toggle" ${config.skipInactiveRecruiter ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div id="bpe-recruiter-statuses" style="margin-top:8px;display:flex;flex-wrap:wrap;">${recruiterStatusesHtml}</div>
        <div style="margin-top:2px;">
          <a href="javascript:;" id="bpe-recruiter-select-all" style="font-size:13px;color:var(--bpe-primary);margin-right:12px;">全选</a>
          <a href="javascript:;" id="bpe-recruiter-select-none" style="font-size:13px;color:#999;">清空</a>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div class="bpe-settings-label">
          <div><span>招呼语质量自检</span><p class="bpe-settings-desc">生成后自动校验格式，不合格时重试一次</p></div>
          <label class="bpe-toggle"><input type="checkbox" id="bpe-greeting-validate" ${config.validateGreeting !== false ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div><span style="font-size:15px;font-weight:700;color:#1f2329;">薪资筛选</span><p class="bpe-settings-desc">岗位薪资不满足条件时自动跳过。设为 0 不限制。</p></div>
        <div class="bpe-range-row" style="margin-top:8px;">
          <span>下限不低于</span>
          <input class="bpe-number-input" type="number" id="bpe-salary-min" value="${config.salaryMin || 0}" min="0" max="200" step="1">
          <span>K，</span>
          <span>上限不高于</span>
          <input class="bpe-number-input" type="number" id="bpe-salary-max" value="${config.salaryMax || 0}" min="0" max="200" step="1">
          <span>K</span>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div class="bpe-settings-label">
          <div><span style="font-size:15px;font-weight:700;color:#1f2329;">AI智能过滤</span><p class="bpe-settings-desc">通过语义匹配判断岗位JD与个人经验的匹配度，过滤不相关岗位（需启动zhitu-ai服务）</p></div>
          <label class="bpe-toggle"><input type="checkbox" id="bpe-ai-filter" ${config.enableAIFilter ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div style="margin-top:8px;">
          <span style="font-size:13px;color:#6b7280;">匹配度阈值：</span>
          <input class="bpe-number-input" type="number" id="bpe-ai-threshold" value="${(config.aiFilterThreshold || 0.35) * 100}" min="10" max="90" step="5" style="width:60px;">
          <span style="font-size:13px;color:#6b7280;">%（建议 30-50%）</span>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div><span style="font-size:15px;font-weight:700;color:#1f2329;">岗位关键词白名单</span><p class="bpe-settings-desc">匹配岗位名称。点击🔒锁定后岗位名必须包含该关键词。按回车或点击添加。</p></div>
        <div class="bpe-company-manager">
          <div class="add-row">
            <input class="bpe-input" type="text" id="bpe-add-whitelist" placeholder="输入关键词，回车添加" maxlength="50">
            <button class="bpe-btn bpe-btn-primary bpe-btn-sm" id="bpe-add-whitelist-btn" style="width:auto;flex-shrink:0;">添加</button>
          </div>
          <div class="bpe-hint" id="bpe-whitelist-hint"></div>
          <div class="bpe-company-list" id="bpe-whitelist-list">
            ${renderWhitelistList(getJobWhitelist())}
          </div>
          <div class="bpe-company-count" id="bpe-whitelist-count">共 ${getJobWhitelist().length} 个</div>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div><span style="font-size:15px;font-weight:700;color:#1f2329;">岗位关键词黑名单</span><p class="bpe-settings-desc">匹配岗位名称。包含任一关键词时自动跳过。按回车或点击添加。</p></div>
        <div class="bpe-company-manager">
          <div class="add-row">
            <input class="bpe-input" type="text" id="bpe-add-blacklist" placeholder="输入关键词，回车添加" maxlength="50">
            <button class="bpe-btn bpe-btn-primary bpe-btn-sm" id="bpe-add-blacklist-btn" style="width:auto;flex-shrink:0;">添加</button>
          </div>
          <div class="bpe-hint" id="bpe-blacklist-hint"></div>
          <div class="bpe-company-list" id="bpe-blacklist-list">
            ${renderKeywordList(config.jobBlacklist || [])}
          </div>
          <div class="bpe-company-count" id="bpe-blacklist-count">共 ${(config.jobBlacklist || []).length} 个</div>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div><span style="font-size:15px;font-weight:700;color:#1f2329;">个人经验数据</span><p class="bpe-settings-desc">导入您的个人经历用于AI生成招呼语和智能匹配。JSON数组格式，每项包含：经验分类、主体名称、担任角色/岗位、起止时间、项目介绍、匹配权重。</p></div>
        <div style="margin-top:8px;">
          <textarea class="bpe-input" id="bpe-resume-data" placeholder='[{"经验分类":"工作经验","主体名称":"公司名","担任角色/岗位":"岗位","起止时间":"2024.01-至今","项目介绍":"描述您的项目成果和量化数据...","匹配权重":"10"}]' style="width:100%;height:120px;font-size:12px;font-family:monospace;resize:vertical;">${getResumeData().length ? escapeHTML(JSON.stringify(getResumeData(), null, 2)) : ''}</textarea>
          <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">
            <button class="bpe-btn bpe-btn-primary bpe-btn-sm" id="bpe-import-resume" style="width:auto;">导入</button>
            <span style="font-size:12px;color:#999;" id="bpe-resume-count">当前 ${getResumeData().length} 条经验记录</span>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #eef0f3;margin:4px 0;">
        <div><span style="font-size:15px;font-weight:700;color:#1f2329;">屏蔽公司管理</span><p class="bpe-settings-desc">添加后自动投递将跳过这些公司。按工商信息全名匹配。</p></div>
        <div class="bpe-company-manager">
          <div class="add-row">
            <input class="bpe-input" type="text" id="bpe-add-company" placeholder="输入公司全名，回车或点击添加" maxlength="100">
            <button class="bpe-btn bpe-btn-primary bpe-btn-sm" id="bpe-add-btn" style="width:auto;flex-shrink:0;">添加</button>
          </div>
          <div class="bpe-hint" id="bpe-company-hint"></div>
          <div class="bpe-company-list" id="bpe-company-list">
            ${renderCompanyList(blockedCompanies)}
          </div>
          <div class="bpe-company-count" id="bpe-company-count">共 ${blockedCompanies.length} 家</div>
        </div>
      </div>`;

    // Create modal with content only (footer is part of content for simplicity)
    const overlay = document.createElement('div');
    overlay.className = 'bpe-modal-overlay';
    overlay.innerHTML = `
      <div class="bpe-modal-panel">
        <div class="bpe-modal-header">
          <div class="bpe-modal-title">增强设置</div>
          <button class="bpe-modal-close">&times;</button>
        </div>
        <div class="bpe-modal-content">${html}</div>
        <div class="bpe-modal-footer">
          <button class="bpe-btn bpe-btn-secondary bpe-btn-sm" id="bpe-clear-companies">清空屏蔽列表</button>
          <button class="bpe-btn bpe-btn-primary" id="bpe-save-settings">保存设置</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Query elements from overlay scope
    const qs = (sel) => overlay.querySelector(sel);

    const addInput = qs('#bpe-add-company');
    const addBtn = qs('#bpe-add-btn');
    const hintEl = qs('#bpe-company-hint');
    const listEl = qs('#bpe-company-list');
    const countEl = qs('#bpe-company-count');
    const clearBtn = qs('#bpe-clear-companies');
    const saveBtn = qs('#bpe-save-settings');
    const closeBtn = qs('.bpe-modal-close');

    function refreshList() {
      const companies = getBlockedCompanies();
      listEl.innerHTML = renderCompanyList(companies);
      countEl.textContent = '共 ' + companies.length + ' 家';
    }

    function showHint(msg, type) {
      hintEl.textContent = msg;
      hintEl.className = 'bpe-hint show ' + (type || '');
      setTimeout(function () { hintEl.classList.remove('show'); }, 2500);
    }

    function addCompany() {
      var name = addInput.value.trim();
      if (!name) { showHint('请输入公司名称', 'error'); addInput.focus(); return; }
      if (addBlockedCompany(name)) {
        addInput.value = '';
        refreshList();
        showHint('已添加「' + name + '」', 'success');
        addInput.focus();
      } else {
        showHint('该公司已在屏蔽列表中', 'error');
        addInput.select();
      }
    }

    function doSave() {
      var updates = {};
      var apiKeyInput = qs('#bpe-api-key');
      var skipToggle = qs('#bpe-skip-company');
      var limitInput = qs('#bpe-apply-limit');
      var minInput = qs('#bpe-interval-min');
      var maxInput = qs('#bpe-interval-max');
      var salaryMinInput = qs('#bpe-salary-min');
      var salaryMaxInput = qs('#bpe-salary-max');

      if (apiKeyInput) { updates.deepseekApiKey = apiKeyInput.value.trim(); setApiKey(apiKeyInput.value.trim()); }
      if (skipToggle) updates.skipCommunicated = skipToggle.checked;
      if (limitInput) updates.applyLimit = Math.max(0, parseInt(limitInput.value) || 0);
      var refreshLimitInput = qs('#bpe-refresh-limit');
      if (refreshLimitInput) updates.refreshLimit = Math.max(0, parseInt(refreshLimitInput.value) || 0);
      if (minInput) updates.applyIntervalMin = Math.max(1, parseInt(minInput.value) || 5);
      if (maxInput) updates.applyIntervalMax = Math.max(1, parseInt(maxInput.value) || 20);
      if (salaryMinInput) updates.salaryMin = Math.max(0, parseInt(salaryMinInput.value) || 0);
      if (salaryMaxInput) updates.salaryMax = Math.max(0, parseInt(salaryMaxInput.value) || 0);

      var recruiterToggle = qs('#bpe-recruiter-toggle');
      var greetingValidate = qs('#bpe-greeting-validate');
      if (recruiterToggle) updates.skipInactiveRecruiter = recruiterToggle.checked;
      var statusChecks = $$('.bpe-recruiter-status');
      var allowedStatuses = [];
      for (var si = 0; si < statusChecks.length; si++) {
        if (statusChecks[si].checked) allowedStatuses.push(statusChecks[si].value);
      }
      updates.allowedRecruiterStatuses = allowedStatuses;
      if (greetingValidate) updates.validateGreeting = greetingValidate.checked;

      var aiFilterToggle = qs('#bpe-ai-filter');
      var aiThresholdInput = qs('#bpe-ai-threshold');
      if (aiFilterToggle) updates.enableAIFilter = aiFilterToggle.checked;
      if (aiThresholdInput) updates.aiFilterThreshold = Math.max(0.1, Math.min(0.9, (parseInt(aiThresholdInput.value) || 35) / 100));

      var resumeTextarea = qs('#bpe-resume-data');
      if (resumeTextarea) {
        try {
          var parsed = parseResumeJSON(resumeTextarea.value.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            setResumeData(parsed);
          }
        } catch (e) {
          // If invalid JSON, don't overwrite existing data
          console.warn('[BPE] Resume data JSON parse failed, keeping old data:', e.message);
        }
      }

      _settingsDirty = false;
      saveConfig(updates);
      saveBlockedCompanies(_workingBlocked);
      // Restore original getters
      getBlockedCompanies = _origGetBlockedCompanies;
      getConfig = _origGetConfig;
      showToast('设置已保存', 'success', 2000);
    }

    // Recruiter status: select all / clear
    var recruiterSelectAll = qs('#bpe-recruiter-select-all');
    var recruiterSelectNone = qs('#bpe-recruiter-select-none');
    if (recruiterSelectAll) {
      recruiterSelectAll.onclick = function () {
        var checks = $$('.bpe-recruiter-status');
        for (var si = 0; si < checks.length; si++) checks[si].checked = true;
      };
    }
    if (recruiterSelectNone) {
      recruiterSelectNone.onclick = function () {
        var checks = $$('.bpe-recruiter-status');
        for (var si = 0; si < checks.length; si++) checks[si].checked = false;
      };
    }

    addBtn.onclick = addCompany;

    // Resume data import button
    var importResumeBtn = qs('#bpe-import-resume');
    if (importResumeBtn) {
      importResumeBtn.onclick = function () {
        var textarea = qs('#bpe-resume-data');
        var countSpan = qs('#bpe-resume-count');
        if (!textarea) return;
        try {
          var raw = textarea.value.trim();
          var parsed = parseResumeJSON(raw);
          if (!Array.isArray(parsed)) { showToast('JSON 格式错误：需要是数组格式', 'error', 3000); return; }
          setResumeData(parsed);
          if (countSpan) countSpan.textContent = '当前 ' + parsed.length + ' 条经验记录';
          showToast('已导入 ' + parsed.length + ' 条经验记录', 'success', 2000);
        } catch (e) {
          showToast('JSON 解析失败: ' + e.message, 'error', 3000);
        }
      };
    }

    addInput.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addCompany(); }
    };

    listEl.onclick = function (e) {
      var delBtn = e.target.closest('.delete-btn');
      if (delBtn) {
        var name = delBtn.dataset.company;
        // dataset 会自动 HTML 解码，但如果公司名含特殊字符（&、"等），
        // escapeHTML 编解码可能导致与存储值不匹配。先从 _workingBlocked
        // 中按解码后的值精确查找，若找不到则尝试模糊匹配。
        var list = getBlockedCompanies();
        var found = list.find(function(c) { return c.name === name; });
        if (!found) {
          // 尝试用解码后的值匹配（dataset 已解码 HTML 实体）
          found = list.find(function(c) { return decodeHTMLEntities(c.name) === name || c.name === decodeHTMLEntities(name); });
        }
        if (found) {
          removeBlockedCompany(found.name);
          refreshList();
          showHint('已移除「' + found.name + '」', 'success');
        } else {
          showHint('未找到该公司「' + name + '」，可能已被删除', 'error');
        }
      }
    };

    // ---- Whitelist handlers ----
    var wlInput = qs('#bpe-add-whitelist');
    var wlAddBtn = qs('#bpe-add-whitelist-btn');
    var wlHintEl = qs('#bpe-whitelist-hint');
    var wlListEl = qs('#bpe-whitelist-list');
    var wlCountEl = qs('#bpe-whitelist-count');

    function refreshWhitelist() {
      var kws = getJobWhitelist();
      wlListEl.innerHTML = renderWhitelistList(kws);
      wlCountEl.textContent = '共 ' + kws.length + ' 个';
    }

    function addWhitelist() {
      var kw = wlInput.value.trim();
      if (!kw) { wlHintEl.textContent = '请输入关键词'; wlHintEl.className = 'bpe-hint show error'; setTimeout(function () { wlHintEl.classList.remove('show'); }, 2500); return; }
      if (addJobWhitelistKeyword(kw)) {
        wlInput.value = '';
        refreshWhitelist();
        wlHintEl.textContent = '已添加「' + kw + '」'; wlHintEl.className = 'bpe-hint show success';
        setTimeout(function () { wlHintEl.classList.remove('show'); }, 2500);
      } else {
        wlHintEl.textContent = '该关键词已存在'; wlHintEl.className = 'bpe-hint show error';
        setTimeout(function () { wlHintEl.classList.remove('show'); }, 2500);
        wlInput.select();
      }
    }

    wlAddBtn.onclick = addWhitelist;
    wlInput.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addWhitelist(); }
    };
    wlListEl.onclick = function (e) {
      var lockBtn = e.target.closest('.bpe-tag-lock');
      if (lockBtn) {
        var kw = lockBtn.dataset.keyword;
        toggleWhitelistLock(kw);
        refreshWhitelist();
        return;
      }
      var delBtn = e.target.closest('.bpe-tag-remove');
      if (delBtn) {
        var kw = delBtn.dataset.keyword;
        if (removeJobWhitelistKeyword(kw)) {
          refreshWhitelist();
          wlHintEl.textContent = '已移除「' + kw + '」'; wlHintEl.className = 'bpe-hint show success';
          setTimeout(function () { wlHintEl.classList.remove('show'); }, 2500);
        }
      }
    };

    // ---- Blacklist handlers ----
    var blInput = qs('#bpe-add-blacklist');
    var blAddBtn = qs('#bpe-add-blacklist-btn');
    var blHintEl = qs('#bpe-blacklist-hint');
    var blListEl = qs('#bpe-blacklist-list');
    var blCountEl = qs('#bpe-blacklist-count');

    function refreshBlacklist() {
      var kws = getJobBlacklist();
      blListEl.innerHTML = renderKeywordList(kws);
      blCountEl.textContent = '共 ' + kws.length + ' 个';
    }

    function addBlacklist() {
      var kw = blInput.value.trim();
      if (!kw) { blHintEl.textContent = '请输入关键词'; blHintEl.className = 'bpe-hint show error'; setTimeout(function () { blHintEl.classList.remove('show'); }, 2500); return; }
      if (addJobBlacklistKeyword(kw)) {
        blInput.value = '';
        refreshBlacklist();
        blHintEl.textContent = '已添加「' + kw + '」'; blHintEl.className = 'bpe-hint show success';
        setTimeout(function () { blHintEl.classList.remove('show'); }, 2500);
      } else {
        blHintEl.textContent = '该关键词已存在'; blHintEl.className = 'bpe-hint show error';
        setTimeout(function () { blHintEl.classList.remove('show'); }, 2500);
        blInput.select();
      }
    }

    blAddBtn.onclick = addBlacklist;
    blInput.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addBlacklist(); }
    };
    blListEl.onclick = function (e) {
      var delBtn = e.target.closest('.bpe-tag-remove');
      if (delBtn) {
        var kw = delBtn.dataset.keyword;
        if (removeJobBlacklistKeyword(kw)) {
          refreshBlacklist();
          blHintEl.textContent = '已移除「' + kw + '」'; blHintEl.className = 'bpe-hint show success';
          setTimeout(function () { blHintEl.classList.remove('show'); }, 2500);
        }
      }
    };

    clearBtn.onclick = function () {
      if (getBlockedCompanies().length === 0) { showHint('当前没有可清空的记录', 'error'); return; }
      if (clearBtn.dataset.confirming === 'true') {
        clearBlockedCompanies();
        refreshList();
        showHint('屏蔽列表已清空', 'success');
        clearBtn.dataset.confirming = 'false';
        clearBtn.textContent = '清空屏蔽列表';
      } else {
        clearBtn.dataset.confirming = 'true';
        clearBtn.textContent = '确认清空？';
        setTimeout(function () { clearBtn.dataset.confirming = 'false'; clearBtn.textContent = '清空屏蔽列表'; }, 3000);
      }
    };

    saveBtn.onclick = function () {
      doSave();
      overlay.classList.remove('show');
    };

    closeBtn.onclick = function () {
      doSave();
      overlay.classList.remove('show');
    };

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        doSave();
        overlay.classList.remove('show');
      }
    });

    // Show modal
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('show');
      });
    });
  }

  function renderCompanyList(companies) {
    if (companies.length === 0) {
      return '<div class="bpe-company-empty">还没有屏蔽记录，在上方输入公司名称添加</div>';
    }
    return companies.map(c => `
      <div class="bpe-company-item">
        <div class="name">${escapeHTML(c.name)}</div>
        <button class="delete-btn" data-company="${escapeHTML(c.name)}" title="删除">删除</button>
      </div>`).join('');
  }

  function renderWhitelistList(items) {
    if (!items || items.length === 0) {
      return '<div style="padding:16px 0;text-align:center;color:#9ca3af;font-size:13px;">还没有关键词，在上方输入后回车添加</div>';
    }
    return '<div class="bpe-repeater-tags">' + items.map(function (item) {
      var isLocked = item.locked;
      var tagClass = isLocked ? 'bpe-tag bpe-tag-locked' : 'bpe-tag';
      var lockIcon = isLocked ? '&#128274;' : '&#128275;';
      var lockTitle = isLocked ? '已锁定：岗位名必须包含此关键词' : '未锁定：点击锁定后岗位名必须包含此关键词';
      return '<span class="' + tagClass + '">'
        + '<span class="bpe-tag-text">' + escapeHTML(item.text) + '</span>'
        + '<span class="bpe-tag-lock" data-keyword="' + escapeHTML(item.text) + '" title="' + lockTitle + '">' + lockIcon + '</span>'
        + '<span class="bpe-tag-remove" data-keyword="' + escapeHTML(item.text) + '" title="删除">&times;</span>'
        + '</span>';
    }).join('') + '</div>';
  }

  function renderKeywordList(keywords) {
    if (!keywords || keywords.length === 0) {
      return '<div style="padding:16px 0;text-align:center;color:#9ca3af;font-size:13px;">还没有关键词，在上方输入后回车添加</div>';
    }
    return '<div class="bpe-repeater-tags">' + keywords.map(function (k) {
      return '<span class="bpe-tag">'
        + '<span class="bpe-tag-text">' + escapeHTML(k) + '</span>'
        + '<span class="bpe-tag-remove" data-keyword="' + escapeHTML(k) + '" title="删除">&times;</span>'
        + '</span>';
    }).join('') + '</div>';
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function decodeHTMLEntities(str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent;
  }

  // ==================== FLOATING BUTTONS ====================

  // Same SVG icons as original Boss-Plus script
  var BPE_ICON_START = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></svg>';
  var BPE_ICON_STOP  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  var BPE_ICON_SKIP  = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></svg>';

  function createFloatingActions() {
    const container = document.createElement('div');
    container.className = 'bpe-floating-actions';
    container.id = 'bpe-floating-actions';

    // Auto apply button (toggle start/stop)
    const applyBtn = document.createElement('button');
    applyBtn.className = 'item';
    applyBtn.id = 'bpe-auto-apply-btn';
    applyBtn.setAttribute('data-tooltip', '自动投递');
    applyBtn.innerHTML = BPE_ICON_START;
    applyBtn.onclick = () => toggleAutoApply();

    // Skip current job button (only visible when running)
    const skipBtn = document.createElement('button');
    skipBtn.className = 'item bpe-skip-btn';
    skipBtn.id = 'bpe-skip-btn';
    skipBtn.setAttribute('data-tooltip', '跳过当前岗位');
    skipBtn.innerHTML = BPE_ICON_SKIP;
    skipBtn.style.display = 'none';
    skipBtn.onclick = () => {
      window._bpe_skip_current = true;
      showToast('正在跳过当前岗位...', 'warn');
    };

    // Settings button
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'item';
    settingsBtn.setAttribute('data-tooltip', '增强设置');
    settingsBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
    settingsBtn.onclick = () => openSettings();

    container.appendChild(applyBtn);
    container.appendChild(skipBtn);
    container.appendChild(settingsBtn);
    document.body.appendChild(container);

    return { applyBtn, skipBtn, settingsBtn };
  }

  function updateApplyButton() {
    var btn = document.getElementById('bpe-auto-apply-btn');
    var skipBtn = document.getElementById('bpe-skip-btn');
    if (!btn) return;
    if (isRunning) {
      btn.classList.add('active');
      btn.innerHTML = BPE_ICON_STOP;
      btn.setAttribute('data-tooltip', '停止自动投递');
      if (skipBtn) skipBtn.style.display = '';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = BPE_ICON_START;
      btn.setAttribute('data-tooltip', '自动投递');
      if (skipBtn) skipBtn.style.display = 'none';
    }
  }

  // ==================== INIT ====================

  function init() {
    // Auto-init API key from GM storage
    var apiKey = GM_getValue('deep_api_key', '');
    if (apiKey) {
      var config = getConfig();
      if (!config.deepseekApiKey) {
        saveConfig({ deepseekApiKey: apiKey });
      }
    }

// Always set up copy job info button (on all pages)
    setupCopyBtnObserver();

    // Chat page: handle greeting paste (same-tab flow)
    if (isChatPage()) {
      handleChatPageGreeting();
      return;
    }

    // Skip-filter button: formal mode, between copy and debug on detail panel
    setupSkipFilterObserver();

    // Debug mode: always available on non-chat pages
    initDebugMode();

    // List page: add floating buttons, check for resume
    if (isListPage()) {
      createFloatingActions();
      updateApplyButton();

      // Switch to target expectation after page refresh
      if (sessionStorage.getItem('bpe_switch_expect') === '1') {
        sessionStorage.removeItem('bpe_switch_expect');
        switchToTargetExpect();
      }

      // Resume auto-apply after returning from chat page
      var resumeRaw = sessionStorage.getItem('bpe_resume');
      if (resumeRaw) {
        sessionStorage.removeItem('bpe_resume');
        try {
          var resumeState = JSON.parse(resumeRaw);
          if (resumeState && resumeState.lastUnfilteredIdx != null) {
            setTimeout(function () {
              startAutoApply(resumeState);
            }, 1500);
          }
        } catch (e) {}
      }
    }
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
