/* ═══════════════════════════════════════════════════════════
   WorkIndex Admin — admin-app.js
   All application logic. Requires: admin.css, admin.html
   ═══════════════════════════════════════════════════════════ */

(function(){
  var API = 'https://workindex-production.up.railway.app/api/admin';
  var tok = localStorage.getItem('admTok') || '';
  var adm = null;
  try { adm = JSON.parse(localStorage.getItem('admData') || 'null'); } catch(e) {}
  var dF = '', dT = '', T = {};
  var _editPostId = null, _creditUid = null, _pwUid = null, _tkId = null;

  function g(id) { return document.getElementById(id); }
  function qa(s) { return Array.from(document.querySelectorAll(s)); }
  function deb(k, fn) { clearTimeout(T[k]); T[k] = setTimeout(fn, 300); }
  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  if (document.readyState !== 'loading') { init(); } else { document.addEventListener('DOMContentLoaded', init); }

  /* ═══ INIT ═══════════════════════════════════════════════════════════════ */
  function init() {
    if (tok && adm) { showApp(); }
    g('loginBtn').onclick = doLogin;
    g('liPw').onkeydown = function(e) { if (e.key === 'Enter') doLogin(); };
    g('logoutBtn').onclick = doLogout;
    if(g('mLogoutBtn')) g('mLogoutBtn').onclick = doLogout;
    /* mobile bottom nav */
    qa('.mni').forEach(function(n){ n.onclick = function(){ goTo(n.dataset.s); }; });
    g('applyDF').onclick = applyDates;
    g('clearDF').onclick = clearDates;
    g('drClose').onclick = closeDr;
    g('chDrClose').onclick = closeChDr;
    g('ov1').onclick = closeDr;
    g('ov2').onclick = closeChDr;
    qa('.ni').forEach(function(n) { n.onclick = function() { goTo(n.dataset.s); }; });

    /* search inputs */
    g('eSrch').oninput = function() { deb('e', function() { loadUsers('expert'); }); };
    g('cSrch').oninput = function() { deb('c', function() { loadUsers('client'); }); };
    g('apSt').onchange = loadApproaches;
    g('crType').onchange = loadCredits;
    g('crSrch').oninput = function() { deb('cr', loadCredits); };
    g('acSrch').oninput = function() { deb('ac', searchActions); };
    g('acRole').onchange = searchActions;
    g('tkSt').onchange = loadTickets;
    g('tkSrch').oninput = function() { deb('tk', loadTickets); };
    g('poSrch').oninput = function() { deb('po', loadPosts); };
    g('poSt').onchange = loadPosts;
    g('rvSrch').oninput = function() { deb('rv', loadReviews); };
    g('rvMin').onchange = loadReviews;
    g('rgSt').onchange = loadRegistrations;
    g('commTarget').onchange = function() {
      g('commCustomBox').style.display = this.value === 'custom' ? 'block' : 'none';
    };
    g('previewCommBtn').onclick = previewComm;
    g('sendCommBtn').onclick = sendComm;
    g('genInvBtn').onclick = genInvoice;
    g('invUserSel').onchange = onInvExpertChange;
    g('invTxSel').onchange = onInvTxChange;
    g('invDesc').oninput = previewInvoice;
    g('invAmt').oninput = previewInvoice;
    g('invDate').oninput = previewInvoice;
    loadInvExperts();

    /* modal close buttons */
    document.addEventListener('click', function(ev) {
      var cl = ev.target.closest('[data-close]');
      if (cl) { closeModal(cl.dataset.close); }
    });

    /* modal submits */
    g('creditSubmit').onclick = submitCredit;
    g('pwSubmit').onclick = submitPw;
    g('savePostBtn').onclick = savePost;
    g('deletePostBtn').onclick = deletePost;
    g('tkApproveBtn').onclick = function() { processTicket('approve'); };
    g('tkRejectBtn').onclick = function() { processTicket('reject'); };
    g('tkResolveBtn').onclick = function() { processTicket('resolve'); };
    g('dmSubmit').onclick = submitDm;
    g('kycApproveBtn').onclick = function() { processKyc('approve'); };
    g('kycRejectBtn').onclick = function() { processKyc('reject'); };
    g('sendAnnBtn').onclick = sendAnnouncement;
    g('hmRole').onchange = function() { loadHeatmap(); };
    g('hmRefresh').onclick = function() { loadHeatmap(); };
    /* delegated: open DM modal */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-dm-uid]');
      if (btn) { ev.preventDefault(); openDmModal(btn.dataset.dmUid, btn.dataset.dmName); return; }
      var tkb = ev.target.closest('[data-tk-uid]');
      if (tkb) { ev.preventDefault(); openCreateTicketModal(tkb.dataset.tkUid, tkb.dataset.tkName, tkb.dataset.tkRole); return; }
      var kb = ev.target.closest('[data-kyc-uid]');
      if (kb) { ev.preventDefault(); openKycModal(kb.dataset.kycUid, kb.dataset.kycName); return; }
      var hb = ev.target.closest('[data-hm-state]');
      if (hb) { ev.preventDefault(); drillHeatmap(hb.dataset.hmState); return; }
    });

    /* delegated: open user drawer */
    document.addEventListener('click', function(ev) {
      var el = ev.target.closest('[data-uid]');
      if (el && !ev.defaultPrevented) { openDr(el.dataset.uid); }
    });
    /* delegated: stat card nav */
    document.addEventListener('click', function(ev) {
      var el = ev.target.closest('[data-goto]');
      if (!el) return;
      var gt = el.dataset.goto;
      if (gt === 'credits-purchase') { goTo('credits'); g('crType').value = 'purchase'; loadCredits(); }
      else if (gt === 'credits-spent') { goTo('credits'); g('crType').value = 'spent'; loadCredits(); }
      else if (gt === 'credits-refund') { goTo('credits'); g('crType').value = 'refund'; loadCredits(); }
      else { goTo(gt); }
    });
    /* delegated: ledger + action uid buttons in drawer */
    document.addEventListener('click', function(ev) {
      var lb = ev.target.closest('[data-ledger-uid]');
      if (lb) { ev.preventDefault(); openLedger(lb.dataset.ledgerUid); return; }
      var ab = ev.target.closest('[data-action-uid]');
      if (ab) { ev.preventDefault(); closeDr(); goActId(ab.dataset.actionUid); return; }
      var cb = ev.target.closest('[data-credit-uid]');
      if (cb) { ev.preventDefault(); openCreditModal(cb.dataset.creditUid, cb.dataset.creditName, cb.dataset.creditBal); return; }
      var pb = ev.target.closest('[data-pw-uid]');
      if (pb) { ev.preventDefault(); openPwModal(pb.dataset.pwUid, pb.dataset.pwName); return; }
    });
    /* delegated: chat view */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-cid]');
      if (btn) { ev.preventDefault(); viewChat(btn.dataset.cid, btn.dataset.en, btn.dataset.cn, btn.dataset.rt); }
    });
    /* delegated: approve/reject refunds */
    document.addEventListener('click', function(ev) {
      var ap = ev.target.closest('[data-approve]');
      if (ap) {
        ev.preventDefault();
        var id = ap.dataset.approve, cr = ap.dataset.credits;
        if (!confirm('Approve ' + cr + ' credits?')) return;
        var note = ''; var nt = g('tn-' + id); if (nt) note = nt.value;
        api('tickets/' + id + '/approve', 'POST', { note: note }).then(function(d) {
          if (d.success) { toast('Approved: ' + d.creditsAdded + ' credits'); var c = g('tc-' + id); if (c) c.parentNode.removeChild(c); loadDashboard(); }
          else toast(d.message || 'Failed', 'e');
        }).catch(function() { toast('Error', 'e'); });
        return;
      }
      var rj = ev.target.closest('[data-reject]');
      if (rj) {
        ev.preventDefault();
        var rid = rj.dataset.reject;
        if (!confirm('Reject this refund?')) return;
        var rnote = ''; var rnt = g('tn-' + rid); if (rnt) rnote = rnt.value;
        api('tickets/' + rid + '/reject', 'POST', { note: rnote }).then(function(d) {
          if (d.success) { toast('Rejected', 'i'); var rc = g('tc-' + rid); if (rc) rc.parentNode.removeChild(rc); }
          else toast(d.message || 'Failed', 'e');
        }).catch(function() { toast('Error', 'e'); });
      }
    });
    /* delegated: action buttons (ban/warn/flag) */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-act]');
      if (!btn) return;
      ev.preventDefault(); ev.stopPropagation();
      var act = btn.dataset.act, uid = btn.dataset.uid, nm = btn.dataset.nm;
      if (act === 'warn') {
        var reason = prompt('Warning reason for ' + nm + ':');
        if (!reason) return;
        doAct(uid, act, reason);
      } else {
        if (!confirm(act + ' ' + nm + '?')) return;
        doAct(uid, act, '');
      }
    });
    /* delegated: post edit */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-edit-post]');
      if (btn) { ev.preventDefault(); openPostModal(btn.dataset.editPost); }
    });
    /* delegated: review delete */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-del-review]');
      if (btn) {
        ev.preventDefault();
        if (!confirm('Delete this review?')) return;
        api('ratings/' + btn.dataset.delReview, 'DELETE').then(function(d) {
          if (d.success) { toast('Review deleted'); loadReviews(); }
          else toast(d.message || 'Failed', 'e');
        }).catch(function() { toast('Error', 'e'); });
      }
    });
    /* delegated: registration approve/reject */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-reg-action]');
      if (btn) {
        ev.preventDefault();
        var uid = btn.dataset.regAction, action = btn.dataset.action, nm = btn.dataset.nm;
        if (!confirm(action + ' ' + nm + '?')) return;
        api('users/' + uid + '/action', 'POST', { action: action }).then(function(d) {
          if (d.success) { toast(d.message); loadRegistrations(); }
          else toast(d.message || 'Failed', 'e');
        }).catch(function() { toast('Error', 'e'); });
      }
    });
    /* delegated: open ticket detail */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-tk-id]');
      if (btn) { ev.preventDefault(); openTicketModal(btn.dataset.tkId); }
    });
    /* delegated: add manual refund */
    document.addEventListener('click', function(ev) {
      var btn = ev.target.closest('[data-manual-refund]');
      if (btn) { ev.preventDefault(); openCreditModal(btn.dataset.manualRefund, btn.dataset.nm, btn.dataset.bal); }
    });
  }

  /* ═══ DATE FILTER ════════════════════════════════════════════════════════ */
  function applyDates() {
    var f = g('dfF').value, t = g('dfT').value;
    if (!f && !t) { toast('Select at least one date', 'i'); return; }
    dF = f; dT = t;
    refresh();
    toast('Date filter applied', 'i');
  }
  function clearDates() {
    dF = ''; dT = '';
    g('dfF').value = ''; g('dfT').value = '';
    refresh();
  }

  /* ═══ AUTH ═══════════════════════════════════════════════════════════════ */
  function doLogin() {
    var id = g('liId').value.trim(), pw = g('liPw').value;
    g('lerr').textContent = '';
    if (!id || !pw) { g('lerr').textContent = 'Please fill all fields'; return; }
    g('lerr').textContent = 'Signing in...';
    g('lerr').style.color = '#a0a0b8';
    fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId: id, password: pw }) })
      .then(function(r) { return r.json(); })
      .then(function(r) {
        g('lerr').style.color = '#ef4444';
        if (r.success) {
          tok = r.token; adm = r.admin;
          localStorage.setItem('admTok', tok);
          localStorage.setItem('admData', JSON.stringify(adm));
          showApp();
        } else { g('lerr').textContent = r.message || 'Invalid credentials'; }
      })
      .catch(function(err) { g('lerr').style.color = '#ef4444'; g('lerr').textContent = 'Connection failed: ' + err.message; });
  }

  function showApp() {
    g('loginWrap').style.display = 'none';
    g('appWrap').style.display = 'block';
    // Dashboard stat card clicks
    document.addEventListener('click', function(ev) {
      var sc = ev.target.closest('[data-goto]');
      if (sc) { ev.preventDefault(); goTo(sc.dataset.goto); }
    });
    var nm = (adm && adm.name) ? adm.name : 'Admin';
    g('sbNm').textContent = nm; g('sbId').textContent = (adm && adm.adminId) || ''; g('sbAv').textContent = nm.charAt(0).toUpperCase();
    if(g('msbNm')) g('msbNm').textContent = nm;
    if(g('msbId')) g('msbId').textContent = (adm && adm.adminId) || '';
    if(g('msbAv')) g('msbAv').textContent = nm.charAt(0).toUpperCase();
    loadDashboard();
  }

  function doLogout() {
    localStorage.removeItem('admTok'); localStorage.removeItem('admData');
    tok = ''; adm = null;
    g('appWrap').style.display = 'none';
    g('loginWrap').style.display = 'flex';
  }

  /* ═══ API ════════════════════════════════════════════════════════════════ */
  function api(path, method, body, noauth) {
    var opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (!noauth && tok) { opts.headers['Authorization'] = 'Bearer ' + tok; }
    if (body) { opts.body = JSON.stringify(body); }
    return fetch(API + '/' + path, opts).then(function(r) { return r.json(); });
  }

  function qs(obj) {
    var p = [];
    if (obj) { Object.keys(obj).forEach(function(k) { if (obj[k] && obj[k] !== 'all') p.push(k + '=' + encodeURIComponent(obj[k])); }); }
    if (dF) p.push('from=' + dF);
    if (dT) p.push('to=' + dT);
    return p.length ? '?' + p.join('&') : '';
  }

  /* ═══ NAVIGATION ═════════════════════════════════════════════════════════ */
  function refresh() {
    var a = document.querySelector('.sec.on'); if (!a) return;
    var s = a.id.replace('sec-', '');
    var m = sectionLoaders();
    if (m[s]) m[s]();
  }

  function sectionLoaders() {
    return {
      dashboard: loadDashboard,
      heatmap: loadHeatmap,
      experts: function() { loadUsers('expert'); },
      clients: function() { loadUsers('client'); },
      approaches: loadApproaches,
      chats: loadChats,
      credits: loadCredits,
      refunds: loadRefunds,
      actions: function() { g('acSrch').value=''; setT('acTbl','<tr><td colspan="6" style="text-align:center;padding:26px;color:#606078">Search for a user to take action</td></tr>'); },
      tickets: loadTickets,
      posts: loadPosts,
      reviews: loadReviews,
      registrations: loadRegistrations,
      payments: loadPayments,
      communication: function() { loadCommHistory(); },
      invoices: function() { loadInvExperts(); },
      settings: function() { loadSettingsTab(); }
    };
  }

  var PT = { dashboard:'Dashboard', heatmap:'Geographic Heatmap', experts:'Experts', clients:'Clients', approaches:'Approaches', chats:'Chats', credits:'Credits', refunds:'Refunds', actions:'Actions', tickets:'Tickets', posts:'Posts', reviews:'Reviews', registrations:'Registrations', payments:'Payments', communication:'Communication', invoices:'Invoices', settings:'Settings' };
  var PS = { dashboard:'Platform overview', heatmap:'Expert & client locations across India', experts:'All registered experts', clients:'All registered clients', approaches:'Expert approach activity', chats:'All conversations', credits:'Credit ledger', refunds:'Pending refund requests', actions:'Ban, warn and flag users', tickets:'All support tickets', posts:'User posted requests', reviews:'Ratings & reviews', registrations:'Expert approval queue', payments:'Failed payment tracking', communication:'Bulk email & notifications', invoices:'Generate invoices', settings:'Admin configuration & platform management' };

  function goTo(s) {
    qa('.sec').forEach(function(e) { e.classList.remove('on'); });
    qa('.ni').forEach(function(e) { e.classList.remove('on'); });
    qa('.mni').forEach(function(e) { e.classList.remove('on'); });
    var sec = g('sec-' + s); if (sec) sec.classList.add('on');
    qa('[data-s="' + s + '"]').forEach(function(el){ el.classList.add('on'); });
    g('ptitle').textContent = PT[s] || s;
    g('psub').textContent = PS[s] || '';
    var m = sectionLoaders();
    if (m[s]) m[s]();
  }

  /* ═══ HELPERS ════════════════════════════════════════════════════════════ */
  function fmt(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'; }
  function fmtT(d) { return d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'; }

  function toast(msg, t) {
    var el = document.createElement('div'); el.className = 'toast-el ' + (t || 's'); el.textContent = msg;
    document.body.appendChild(el); setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  }

  function bdg(s) {
    var m = { pending:'byw', accepted:'bgr', rejected:'brd', active:'bbl', completed:'bgr', cancelled:'brd', resolved:'btl', pending_review:'byw', client:'bbl', expert:'bo', banned:'brd', open:'bbl', flagged:'brd', approved:'bgr' };
    return '<span class="badge ' + (m[s] || 'bgy') + '">' + esc(s) + '</span>';
  }
  function ust(u) {
    if (u.isBanned) return '<span class="badge brd">Banned</span>';
    if (u.isFlagged) return '<span class="badge byw">Flagged</span>';
    return '<span class="badge bgr">Active</span>';
  }
  function stars(n) { var s = ''; for (var i=0;i<5;i++) s += (i<n?'&#11088;':'&#9734;'); return '<span style="font-size:11px">' + s + '</span>'; }
  function setT(id, html) { var el = g(id); if (el) el.innerHTML = html || '<tr><td colspan="20" style="text-align:center;padding:30px;color:#606078">No data found</td></tr>'; }
  function spin() { return '<tr><td colspan="20" style="text-align:center;padding:24px"><div class="spin"></div></td></tr>'; }
  function uLnk(uid, name, col) { return '<span data-uid="' + esc(uid) + '" style="cursor:pointer;color:' + (col || '#FC8019') + ';font-weight:600">' + esc(name) + '</span>'; }

  function openModal(id) { var m = g(id); if (m) m.classList.add('on'); }
  function closeModal(id) { var m = g(id); if (m) m.classList.remove('on'); }

  /* ═══ EXPORT CSV ═════════════════════════════════════════════════════════ */
  function exportCSV(data, filename) {
    if (!data.length) { toast('No data to export', 'i'); return; }
    var keys = Object.keys(data[0]);
    var csv = keys.join(',') + '\n' + data.map(function(row) {
      return keys.map(function(k) {
        var v = row[k] || '';
        return '"' + String(v).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename + '.csv';
    a.click();
  }

  /* ═══ DASHBOARD ══════════════════════════════════════════════════════════ */
  function loadDashboard() {
    api('stats' + qs({})).then(function(d) {
      if (!d.success) return;
      var st = d.stats, cr = st.credits || {};
      g('sgrid').innerHTML = [
        sc('Total Clients', st.totalClients, 'cb', 'clients'),
        sc('Total Experts', st.totalExperts, 'co', 'experts'),
        sc('Approaches', st.totalApproaches, '', 'approaches', (st.openApproaches||0) + ' open / ' + (st.closedApproaches||0) + ' closed'),
        sc('Requests', st.totalRequests, '', 'posts'),
        sc('Reviews', st.totalReviews || 0, 'cy', 'reviews'),
        sc('Credits Purchased', cr.totalPurchased || 0, 'cg', 'credits-purchase'),
        sc('Credits Spent', cr.totalSpent || 0, 'co', 'credits-spent'),
        sc('Credits Refunded', cr.totalRefunded || 0, 'cpu', 'credits-refund'),
        sc('Pending Refunds', st.pendingRefunds || 0, 'cy', 'refunds'),
        sc('Open Tickets', st.openTickets || 0, 'cb', 'tickets')
      ].join('');
      var rb = g('rbadge'); if ((st.pendingRefunds||0) > 0) { rb.textContent = st.pendingRefunds; rb.style.display = 'inline-block'; }
      var tb = g('tkbadge'); if ((st.openTickets||0) > 0) { tb.textContent = st.openTickets; tb.style.display = 'inline-block'; }
      setT('recentTbl', (d.recentUsers || []).map(function(u) {
        return '<tr><td>' + uLnk(u._id, u.name) + '</td><td>' + bdg(u.role) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc(u.email) + '</td><td style="color:#f59e0b">' + (u.credits || 0) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(u.createdAt) + '</td></tr>';
      }).join(''));
    }).catch(function(e) { console.error('Dashboard err:', e); });
  }

  function sc(label, val, col, goto_, sub) {
    var cl = goto_ ? ' cl" data-goto="' + goto_ + '"' : '"';
    var colorMap = { cb:'#3b82f6', co:'#FC8019', cg:'#22c55e', cy:'#f59e0b', cpu:'#a855f7', cblu:'#3b82f6', '':'#f0f0f4' };
    var clr = colorMap[col] || '#f0f0f4';
    return '<div class="sc' + cl + '><div class="sclbl">' + label + '</div><div class="scval" style="color:' + clr + '">' + val + '</div>' + (sub ? '<div class="scsub">' + sub + '</div>' : '') + (goto_ ? '<div class="sclink">View &rarr;</div>' : '') + '</div>';
  }

  /* ═══ USERS ══════════════════════════════════════════════════════════════ */
  function loadUsers(role) {
    var si = role === 'expert' ? 'eSrch' : 'cSrch', ti = role === 'expert' ? 'eTbl' : 'cTbl';
    var srch = g(si) ? g(si).value : '';
    setT(ti, spin());
    api('users' + qs({ role: role, search: srch })).then(function(d) {
      if (!d.success) { setT(ti, ''); return; }
      /* export button */
      var card = document.querySelector('#sec-' + (role==='expert'?'experts':'clients') + ' .ch');
      if (card && !card.querySelector('.exp-btn')) {
        var eb = document.createElement('button');
        eb.className = 'btn bgho exp-btn'; eb.textContent = 'Export CSV';
        eb.onclick = function() {
          exportCSV((d.users||[]).map(function(u) {
            return { Name: u.name, Email: u.email, Phone: u.phone||'', Role: u.role, Credits: u.credits||0, Status: u.isBanned?'Banned':u.isFlagged?'Flagged':'Active', Joined: fmt(u.createdAt) };
          }), role + 's-export');
        };
        card.appendChild(eb);
      }
      if (role === 'expert') {
        setT('eTbl', (d.users || []).map(function(u) {
          return '<tr><td>' + uLnk(u._id, u.name) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc(u.email) + '</td><td style="font-size:12px">' + (u.phone||'-') + '</td><td style="color:#f59e0b">' + (u.credits||0) + '</td><td>' + (u.rating||'-') + '</td><td>' + ust(u) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(u.createdAt) + '</td><td><span class="btn bgho" data-uid="' + esc(u._id) + '">View</span></td></tr>';
        }).join(''));
      } else {
        setT('cTbl', (d.users || []).map(function(u) {
          return '<tr><td>' + uLnk(u._id, u.name) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc(u.email) + '</td><td style="font-size:12px">' + (u.phone||'-') + '</td><td>' + ust(u) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(u.createdAt) + '</td><td><span class="btn bgho" data-uid="' + esc(u._id) + '">View</span></td></tr>';
        }).join(''));
      }
    }).catch(function() { setT(ti, ''); });
  }

  /* ═══ USER DRAWER ════════════════════════════════════════════════════════ */
  function openDr(uid) {
    if (!uid) return;
    g('ov1').classList.add('on'); g('dr1').classList.add('on');
    g('drB').innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';
    g('drTabs').innerHTML = '';
    api('users/' + uid + qs({})).then(function(d) {
      if (!d.success) { g('drB').innerHTML = '<div class="empty"><h3>Failed to load</h3></div>'; return; }
      g('drT').textContent = d.user.name;
      buildDr(d.user, d);
    }).catch(function() { g('drB').innerHTML = '<div class="empty"><h3>Error</h3></div>'; });
  }

  function buildDr(u, d) {
    var tabs = ['Profile', 'Transactions', u.role === 'expert' ? 'Approaches' : 'Requests', 'Tickets'];
    g('drTabs').innerHTML = tabs.map(function(t, i) {
      return '<div class="drt' + (i===0?' on':'') + '" data-panel="dp' + i + '">' + t + '</div>';
    }).join('');
    g('drTabs').addEventListener('click', function(ev) {
      var tab = ev.target.closest('.drt'); if (!tab) return;
      qa('.drt').forEach(function(e) { e.classList.remove('on'); });
      qa('.drp').forEach(function(e) { e.classList.remove('on'); });
      tab.classList.add('on');
      var p = g(tab.dataset.panel); if (p) p.classList.add('on');
    });

    var pr = u.profile || {};
    var av = u.profilePhoto ? '<img src="' + esc(u.profilePhoto) + '" alt="">' : esc((u.name||'?').charAt(0).toUpperCase());
    var p0 = '<div class="uhero"><div class="uav">' + av + '</div><div class="uhi"><h3>' + esc(u.name) + '</h3><p>' + esc(u.email) + ' / ' + esc(u.phone||'No phone') + '</p><div style="display:flex;gap:5px;flex-wrap:wrap">' + bdg(u.role) + ust(u) + (u.warnings ? '<span class="badge bo">' + u.warnings + ' warns</span>' : '') + '</div></div></div>';
    p0 += '<div class="igrid"><div class="ic"><label>Credits</label><span style="color:#f59e0b">' + (u.credits||0) + '</span></div><div class="ic"><label>Joined</label><span>' + fmt(u.createdAt) + '</span></div><div class="ic"><label>Last Login</label><span>' + fmt(u.lastLogin) + '</span></div><div class="ic"><label>Rating</label><span>' + (u.rating||'-') + ' (' + (u.reviewCount||0) + ')</span></div>' + (pr.specialization ? '<div class="ic"><label>Specialization</label><span>' + esc(pr.specialization) + '</span></div>' : '') + '</div>';
    /* Action buttons */
    var actionRow = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
    actionRow += '<button class="btn bgho" style="justify-content:center" data-ledger-uid="' + u._id + '">Credit Ledger</button>';
    actionRow += '<button class="btn bywn" style="justify-content:center" data-credit-uid="' + u._id + '" data-credit-name="' + esc(u.name) + '" data-credit-bal="' + (u.credits||0) + '">Adjust Credits</button>';
    actionRow += '<button class="btn bgy" style="justify-content:center;background:rgba(255,255,255,.06);color:#f0f0f4" data-pw-uid="' + u._id + '" data-pw-name="' + esc(u.name) + '">Reset Password</button>';
    actionRow += '<button class="btn brdn" style="justify-content:center" data-action-uid="' + u._id + '">Take Action</button>';
    actionRow += '<button class="btn bpri" style="justify-content:center" data-dm-uid="' + u._id + '" data-dm-name="' + esc(u.name) + '">&#128172; Send DM</button>';
    actionRow += '<button class="btn bywn" style="justify-content:center" data-tk-uid="' + u._id + '" data-tk-name="' + esc(u.name) + '" data-tk-role="' + esc(u.role||'user') + '">&#43; Create Ticket</button>';
    actionRow += '</div>';
    p0 += actionRow;

    var cs = d.creditSummary, p1 = '';
    if (cs) { p1 = '<div class="ledger"><div class="lc"><label>Purchased</label><span style="color:#22c55e">+' + (cs.purchased||0) + '</span></div><div class="lc"><label>Spent</label><span style="color:#ef4444">-' + (cs.spent||0) + '</span></div><div class="lc"><label>Refunded</label><span style="color:#a855f7">+' + (cs.refunded||0) + '</span></div><div class="lc"><label>Balance</label><span style="color:#f59e0b">' + (cs.closing||0) + '</span></div></div>'; }
    p1 += '<div class="slbl">Transaction History</div>';
    p1 += (d.transactions||[]).length ? (d.transactions||[]).map(function(tx) {
      return '<div class="txi"><div><div class="txd">' + esc(tx.description||tx.type) + '</div><div class="txm">' + fmtT(tx.createdAt) + '</div></div><span class="txa ' + (tx.amount>0?'p':'n') + '">' + (tx.amount>0?'+':'') + tx.amount + '</span></div>';
    }).join('') : '<p style="color:#606078;font-size:13px;padding:8px">No transactions</p>';

    var items = u.role === 'expert' ? (d.approaches||[]) : (d.requests||[]);
    var p2 = '<div class="slbl">' + (u.role==='expert'?'Approaches':'Requests') + '</div>';
    p2 += items.length ? items.map(function(it) {
      var title = u.role === 'expert' ? ((it.request&&it.request.title)||'-') : (it.title||'-');
      var sub = fmtT(it.createdAt) + (u.role==='expert' ? ' / ' + (it.creditsSpent||0) + ' cr' + (it.client?' / '+esc(it.client.name||''):'') : '');
      return '<div class="txi" style="flex-direction:column;align-items:flex-start;gap:5px"><div style="display:flex;justify-content:space-between;width:100%;align-items:center"><div class="txd">' + esc(title) + '</div>' + bdg(it.status||'pending') + '</div><div class="txm">' + sub + '</div></div>';
    }).join('') : '<p style="color:#606078;font-size:13px;padding:8px">None</p>';

    var p3 = '<div class="slbl">Support Tickets</div>';
    p3 += (d.tickets||[]).length ? (d.tickets||[]).map(function(t) {
      return '<div class="txi" style="flex-direction:column;align-items:flex-start;gap:4px"><div style="display:flex;justify-content:space-between;width:100%"><span class="txd">' + esc(t.issueType||'Support') + '</span>' + bdg(t.status) + '</div><div class="txm">' + fmtT(t.createdAt) + ' / ' + (t.decision||'-') + ' / ' + (t.eligibleCredits||0) + ' cr</div></div>';
    }).join('') : '<p style="color:#606078;font-size:13px;padding:8px">No tickets</p>';

    g('drB').innerHTML = '<div class="drp on" id="dp0">' + p0 + '</div><div class="drp" id="dp1">' + p1 + '</div><div class="drp" id="dp2">' + p2 + '</div><div class="drp" id="dp3">' + p3 + '</div>';
  }

  function closeDr() { g('ov1').classList.remove('on'); g('dr1').classList.remove('on'); }

  /* ═══ CREDIT MODAL ═══════════════════════════════════════════════════════ */
  function openCreditModal(uid, name, bal) {
    _creditUid = uid;
    g('creditModalInfo').innerHTML = '<strong>' + esc(name) + '</strong><br>Current balance: <span style="color:#f59e0b">' + bal + ' credits</span>';
    g('creditAmount').value = '';
    g('creditReason').value = '';
    openModal('creditModal');
  }

  function submitCredit() {
    if (!_creditUid) return;
    var action = g('creditAction').value;
    var amount = parseInt(g('creditAmount').value);
    var reason = g('creditReason').value;
    if (!amount || amount <= 0) { toast('Enter valid amount', 'e'); return; }
    api('users/' + _creditUid + '/credits', 'POST', { action: action, amount: amount, reason: reason })
      .then(function(d) {
        if (d.success) { toast('Credits updated!'); closeModal('creditModal'); closeDr(); }
        else toast(d.message || 'Failed', 'e');
      }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ RESET PASSWORD MODAL ═══════════════════════════════════════════════ */
  function openPwModal(uid, name) {
    _pwUid = uid;
    g('pwModalInfo').textContent = 'Reset password for: ' + name;
    g('newPw').value = ''; g('newPw2').value = '';
    openModal('pwModal');
  }

  function submitPw() {
    if (!_pwUid) return;
    var p1 = g('newPw').value, p2 = g('newPw2').value;
    if (!p1 || p1.length < 8) { toast('Password must be 8+ characters', 'e'); return; }
    if (p1 !== p2) { toast('Passwords do not match', 'e'); return; }
    api('users/' + _pwUid + '/reset-password', 'POST', { newPassword: p1 })
      .then(function(d) {
        if (d.success) { toast('Password reset!'); closeModal('pwModal'); }
        else toast(d.message || 'Failed', 'e');
      }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ LEDGER ═════════════════════════════════════════════════════════════ */
  function openLedger(eid) {
    closeDr();
    g('ov1').classList.add('on'); g('dr1').classList.add('on');
    g('drT').textContent = 'Credit Ledger'; g('drTabs').innerHTML = '';
    g('drB').innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';
    api('credits/expert/' + eid + qs({})).then(function(d) {
      if (!d.success) return;
      var sm = d.summary || {}, txs = d.transactions || [];
      var html = '<div class="ledger"><div class="lc"><label>Opening</label><span>' + (sm.opening||0) + '</span></div><div class="lc"><label>Purchased</label><span style="color:#22c55e">+' + (sm.purchased||0) + '</span></div><div class="lc"><label>Spent</label><span style="color:#ef4444">-' + (sm.spent||0) + '</span></div><div class="lc"><label>Balance</label><span style="color:#f59e0b">' + (sm.closing||0) + '</span></div></div>';
      html += '<div class="slbl">All Transactions (' + txs.length + ')</div>';
      html += txs.length ? txs.map(function(tx) {
        var sub = fmtT(tx.createdAt) + (tx.relatedClient&&tx.relatedClient.name?' / '+esc(tx.relatedClient.name):'') + (tx.relatedRequest&&tx.relatedRequest.title?' / '+esc(tx.relatedRequest.title):'');
        return '<div class="txi"><div><div class="txd">' + esc(tx.description||tx.type) + '</div><div class="txm">' + sub + '</div></div><div style="text-align:right"><div class="txa ' + (tx.amount>0?'p':'n') + '">' + (tx.amount>0?'+':'') + tx.amount + '</div><div class="txm">Bal: ' + (tx.balanceAfter||0) + '</div></div></div>';
      }).join('') : '<p style="color:#606078;font-size:13px;padding:8px">No transactions</p>';
      g('drB').innerHTML = html;
    }).catch(function() { g('drB').innerHTML = '<div class="empty"><h3>Error</h3></div>'; });
  }

  /* ═══ APPROACHES ═════════════════════════════════════════════════════════ */
  function loadApproaches() {
    setT('apTbl', spin());
    api('approaches' + qs({ status: g('apSt').value })).then(function(d) {
      setT('apTbl', (d.approaches||[]).map(function(a) {
        var en = a.expert ? esc(a.expert.name||'-') : '-', eid = a.expert ? a.expert._id : '';
        var actions = '<div style="display:flex;gap:4px">';
        if (a.status === 'pending') {
          actions += '<button class="btn bgrn" data-ap-id="' + a._id + '" data-ap-act="accepted">Accept</button>';
          actions += '<button class="btn brdn" data-ap-id="' + a._id + '" data-ap-act="rejected">Reject</button>';
        }
        actions += '<button class="btn bgho" data-ap-del="' + a._id + '">Delete</button></div>';
        return '<tr><td><span data-uid="' + eid + '" style="cursor:pointer;color:#FC8019;font-weight:600">' + en + '</span></td><td style="color:#a0a0b8">' + (a.client?esc(a.client.name):'-') + '</td><td style="font-size:12px">' + (a.request?esc(a.request.title):'-') + '</td><td style="color:#f59e0b">' + (a.creditsSpent||0) + '</td><td>' + bdg(a.status) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(a.createdAt) + '</td><td>' + actions + '</td></tr>';
      }).join(''));
      // Delegated events for approach actions
      document.getElementById('apTbl').addEventListener('click', function(ev) {
        var ab = ev.target.closest('[data-ap-act]');
        var db = ev.target.closest('[data-ap-del]');
        if (ab) { updateApproach(ab.dataset.apId, ab.dataset.apAct); }
        if (db) { if(confirm('Delete this approach?')) deleteApproach(db.dataset.apDel); }
      }, {once: true});
    }).catch(function() { setT('apTbl', ''); });
  }

  function updateApproach(id, status) {
    api('approaches/' + id, 'PUT', { status: status }).then(function(d) {
      if (d.success) { toast('Approach ' + status); loadApproaches(); }
      else toast(d.message||'Failed', 'e');
    }).catch(function() { toast('Error', 'e'); });
  }

  function deleteApproach(id) {
    api('approaches/' + id, 'DELETE').then(function(d) {
      if (d.success) { toast('Approach deleted'); loadApproaches(); }
      else toast(d.message||'Failed', 'e');
    }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ CHATS ══════════════════════════════════════════════════════════════ */
  function loadChats() {
    setT('chTbl', spin());
    api('chats' + qs({})).then(function(d) {
      var chats = d.chats || [];
      setT('chTbl', chats.map(function(c) {
        var en = c.expert ? esc(c.expert.name||'-') : '-', eid = c.expert ? c.expert._id : '';
        var cn = c.client ? esc(c.client.name||'-') : '-', cid2 = c.client ? c.client._id : '';
        var rt = c.request ? esc(c.request.title||'-') : (c.requestTitle ? esc(c.requestTitle) : '-');
        var lm = esc(((c.lastMessage||'No messages yet').substring(0, 50)));
        return '<tr>' +
          '<td><span data-uid="' + eid + '" style="cursor:pointer;color:#FC8019;font-weight:600">' + en + '</span></td>' +
          '<td><span data-uid="' + cid2 + '" style="cursor:pointer;color:#3b82f6;font-weight:600">' + cn + '</span></td>' +
          '<td style="font-size:12px">' + rt + '</td>' +
          '<td style="font-size:12px;color:#a0a0b8;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + lm + '</td>' +
          '<td style="font-size:12px;color:#a0a0b8">' + fmt(c.lastMessageAt||c.updatedAt||c.createdAt) + '</td>' +
          '<td><button class="btn bgho chat-view-btn" data-chat-id="' + c._id + '" data-en="' + en + '" data-cn="' + cn + '" data-rt="' + rt + '">View Chat</button></td>' +
          '</tr>';
      }).join(''));
      // Wire up view chat buttons - use delegation on table
      var tbl = document.getElementById('chTbl');
      if (tbl) {
        tbl.addEventListener('click', function(ev) {
          var btn = ev.target.closest('.chat-view-btn');
          if (!btn) return;
          viewChat(btn.dataset.chatId, btn.dataset.en, btn.dataset.cn, btn.dataset.rt);
        });
      }
    }).catch(function() { setT('chTbl', ''); });
  }

  function viewChat(cid, en, cn, rt) {
    g('ov2').classList.add('on'); g('dr2').classList.add('on');
    g('chDrT').textContent = en + ' ↔ ' + cn;
    g('chDrMeta').innerHTML = '<span class="badge bgy" style="margin-bottom:10px">' + esc(rt) + '</span>';
    g('chDrMsgs').innerHTML = '<div style="text-align:center;padding:20px"><div class="spin"></div></div>';
    // Try the /messages endpoint first, fall back to reading chat directly
    function fetchAndRenderMsgs(msgs) {
      if (!msgs.length) {
        g('chDrMsgs').innerHTML = '<div class="empty"><h3>No messages yet</h3><p style="font-size:13px;color:#606078">Conversation started but no messages exchanged</p></div>';
        return;
      }
      g('chDrMsgs').innerHTML = msgs.map(function(m) {
        var senderName = (m.sender && typeof m.sender === 'object' ? (m.sender.name||'Unknown') : (m.senderName||'Unknown'));
        var senderRole = (m.sender && typeof m.sender === 'object' ? (m.sender.role||'') : '') || m.senderRole || '';
        var isAdmin  = m.isAdminMessage || senderRole === 'admin';
        var isExpert = !isAdmin && senderRole === 'expert';
        var cls = isAdmin ? 'admin' : (isExpert ? 'out' : 'in');
        var label = isAdmin ? '🔑 Admin' : (esc(senderName) + (senderRole ? ' (' + senderRole + ')' : ''));
        return '<div class="cmsg ' + cls + '">' +
          '<div class="cmeta">' + label + '</div>' +
          '<div style="margin-top:3px">' + esc(m.text || m.message || m.content || '[media]') + '</div>' +
          '<div class="cmeta" style="margin-top:4px;text-align:right">' + fmtT(m.createdAt) + '</div>' +
          '</div>';
      }).join('');
      setTimeout(function() { g('chDrMsgs').scrollTop = g('chDrMsgs').scrollHeight; }, 50);
    }

    api('chats/' + cid + '/messages').then(function(d) {
      // Backend returns: d.messages (array) OR d.chat.messages (embedded)
      var msgs = d.messages || (d.chat && d.chat.messages) || [];
      if (!msgs.length) {
        g('chDrMsgs').innerHTML = '<div class="empty"><h3>No messages yet</h3><p>Conversation started but no messages exchanged</p></div>';
        return;
      }
      fetchAndRenderMsgs(msgs);
    }).catch(function() {
      // Fallback: try getting chat directly and reading embedded messages
      api('chats/' + cid).then(function(d2) {
        var msgs2 = (d2.chat && d2.chat.messages) || d2.messages || [];
        fetchAndRenderMsgs(msgs2);
      }).catch(function(err) {
        g('chDrMsgs').innerHTML = '<p style="text-align:center;color:#ef4444;padding:20px">Error loading messages</p>';
      });
    });
  }

  function closeChDr() { g('ov2').classList.remove('on'); g('dr2').classList.remove('on'); }

  /* ═══ CREDITS ════════════════════════════════════════════════════════════ */
  function loadCredits() {
    var type = g('crType').value, srch = g('crSrch').value.toLowerCase();
    setT('crTbl', spin());
    api('credits' + qs({ type: type })).then(function(d) {
      var txs = d.transactions || [];
      if (srch) { txs = txs.filter(function(t) { return t.user && ((t.user.name||'').toLowerCase().indexOf(srch) >= 0 || (t.user.email||'').toLowerCase().indexOf(srch) >= 0); }); }
      var tc = { purchase:'bgr', spent:'bo', refund:'bpu', bonus:'btl' };
      setT('crTbl', txs.map(function(tx) {
        var uid = tx.user ? tx.user._id : '', un = tx.user ? esc(tx.user.name||'-') : '-', ue = tx.user ? esc(tx.user.email||'') : '';
        return '<tr><td><span data-uid="' + uid + '" style="cursor:pointer;color:#FC8019;font-weight:600">' + un + '</span><br><small style="color:#606078">' + ue + '</small></td><td><span class="badge ' + (tc[tx.type]||'bgy') + '">' + (tx.type||'') + '</span></td><td style="color:' + (tx.amount>0?'#22c55e':'#ef4444') + '">' + (tx.amount>0?'+':'') + tx.amount + '</td><td style="color:#f59e0b">' + (tx.balanceAfter||0) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc((tx.description||'-').substring(0, 40)) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmtT(tx.createdAt) + '</td></tr>';
      }).join(''));
    }).catch(function() { setT('crTbl', ''); });
  }

  /* ═══ REFUNDS ════════════════════════════════════════════════════════════ */
  function loadRefunds() {
    g('rfList').innerHTML = '<div style="text-align:center;padding:40px"><div class="spin"></div></div>';
    /* load all experts too so admin can manually add credits */
    api('tickets?status=pending_review&limit=100').then(function(d) {
      var ts = d.tickets || [];
      var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:13px;color:#a0a0b8">' + ts.length + ' pending requests</div><button class="btn bywn" id="manualCreditBtn">+ Manual Credit Adjustment</button></div>';
      if (!ts.length) {
        g('rfList').innerHTML = header + '<div class="empty"><h3>No pending refunds</h3></div>';
        g('manualCreditBtn').onclick = function() { openManualCredit(); };
        return;
      }
      g('rfList').innerHTML = header + ts.map(function(t) {
        var u = t.user || {}, uid = u._id || '', un = esc(u.name||'-'), ue = esc(u.email||'');
        var bk = (t.transactionBreakdown||[]).filter(function(b) { return b.eligible; }).map(function(b) {
          return '<div class="trow"><span>' + esc(b.clientName||'Client') + '</span><span style="color:#606078">' + esc(b.reason||'') + '</span><span style="color:#f59e0b">' + (b.creditsSpent||0) + ' cr</span></div>';
        }).join('');
        return '<div class="tcard" id="tc-' + t._id + '"><div class="ttop"><div class="ttu"><div class="ttav">' + esc((u.name||'U').charAt(0).toUpperCase()) + '</div><div class="tti"><strong>' + un + '</strong><small>' + ue + ' / ' + (u.credits||0) + ' credits</small></div></div><span class="badge byw">Pending</span></div><div class="tamt">+' + (t.eligibleCredits||0) + ' credits requested</div>' + bk + '<div style="font-size:12px;color:#606078;margin:8px 0">' + fmtT(t.createdAt) + '</div><textarea class="tnote" id="tn-' + t._id + '" rows="2" placeholder="Admin note (optional)..."></textarea><div class="tacrow"><button class="btn bgrn" style="flex:1;padding:10px" data-approve="' + t._id + '" data-credits="' + (t.eligibleCredits||0) + '">Approve ' + (t.eligibleCredits||0) + ' credits</button><button class="btn brdn" style="flex:1;padding:10px" data-reject="' + t._id + '">Reject</button><span class="btn bgho" style="padding:10px" data-uid="' + uid + '">Profile</span></div></div>';
      }).join('');
      g('manualCreditBtn').onclick = function() { openManualCredit(); };
    }).catch(function() { g('rfList').innerHTML = '<div class="empty"><h3>Failed to load</h3></div>'; });
  }

  function openManualCredit() {
    /* search for expert first */
    var nm = prompt('Enter expert name or email to add credits:');
    if (!nm) return;
    api('users' + qs({ role: 'expert', search: nm })).then(function(d) {
      var users = d.users || [];
      if (!users.length) { toast('No expert found', 'e'); return; }
      var u = users[0];
      openCreditModal(u._id, u.name, u.credits || 0);
    }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ TICKETS ════════════════════════════════════════════════════════════ */
  function loadTickets() {
    setT('tkTbl', spin());
    var st = g('tkSt').value, srch = g('tkSrch').value;
    api('tickets' + qs({ status: st })).then(function(d) {
      var ts = d.tickets || [];
      if (srch) { srch = srch.toLowerCase(); ts = ts.filter(function(t) { return t.user && ((t.user.name||'').toLowerCase().indexOf(srch)>=0||(t.user.email||'').toLowerCase().indexOf(srch)>=0); }); }
      setT('tkTbl', ts.map(function(t) {
        var u = t.user || {};
        return '<tr><td>' + uLnk(u._id||'', u.name||'-') + '<br><small style="color:#606078">' + esc(u.email||'') + '</small></td><td style="font-size:12px">' + esc(t.issueType||'-') + '</td><td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc((t.subject||t.description||'-').substring(0,60)) + '</td><td>' + bdg(t.status) + '</td><td style="color:#f59e0b">' + (t.eligibleCredits||0) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(t.createdAt) + '</td><td><button class="btn bgho" data-tk-id="' + t._id + '">View</button></td></tr>';
      }).join(''));
    }).catch(function() { setT('tkTbl', ''); });
  }

  function openTicketModal(tid) {
    _tkId = tid;
    g('tkModalBody').innerHTML = '<div style="text-align:center;padding:20px"><div class="spin"></div></div>';
    openModal('ticketModal');
    api('tickets/' + tid).then(function(d) {
      if (!d.success || !d.ticket) { g('tkModalBody').innerHTML = '<p style="color:#606078">Failed to load</p>'; return; }
      var t = d.ticket, u = t.user || {};
      g('tkModalTitle').textContent = 'Ticket: ' + (t.issueType || 'Support');
      var html = '<div class="uhero" style="margin-bottom:12px"><div class="ttav">' + esc((u.name||'U').charAt(0).toUpperCase()) + '</div><div><strong>' + esc(u.name||'-') + '</strong><div style="font-size:12px;color:#a0a0b8">' + esc(u.email||'') + '</div></div></div>';
      html += '<div class="igrid" style="margin-bottom:12px"><div class="ic"><label>Status</label>' + bdg(t.status) + '</div><div class="ic"><label>Credits Req</label><span style="color:#f59e0b">' + (t.eligibleCredits||0) + '</span></div><div class="ic"><label>Created</label><span>' + fmt(t.createdAt) + '</span></div><div class="ic"><label>Decision</label><span>' + (t.decision||'Pending') + '</span></div></div>';
      if (t.description) html += '<div class="tk-body" style="background:#18181d;padding:12px;border-radius:8px;margin-bottom:12px">' + esc(t.description) + '</div>';
      if ((t.transactionBreakdown||[]).length) {
        html += '<div class="slbl">Breakdown</div>';
        t.transactionBreakdown.forEach(function(b) {
          html += '<div class="trow"><span>' + esc(b.clientName||'Client') + '</span><span>' + esc(b.reason||'') + '</span><span style="color:' + (b.eligible?'#22c55e':'#606078') + '">' + (b.creditsSpent||0) + ' cr</span></div>';
        });
      }
      if (t.adminNote) html += '<div style="margin-top:12px;padding:10px;background:#18181d;border-radius:8px;font-size:12px;color:#a0a0b8">Admin note: ' + esc(t.adminNote) + '</div>';
      html += '<textarea class="tnote" id="tkNote" rows="2" placeholder="Add admin note..." style="margin-top:12px">' + (t.adminNote||'') + '</textarea>';
      g('tkModalBody').innerHTML = html;
      var isPending = t.status === 'pending_review';
      g('tkApproveBtn').style.display = isPending ? 'inline-flex' : 'none';
      g('tkRejectBtn').style.display = isPending ? 'inline-flex' : 'none';
      g('tkResolveBtn').style.display = (t.status === 'open') ? 'inline-flex' : 'none';
    }).catch(function() { g('tkModalBody').innerHTML = '<p style="color:#606078">Error</p>'; });
  }

  function processTicket(action) {
    if (!_tkId) return;
    var note = ''; var nt = g('tkNote'); if (nt) note = nt.value;
    var path = action === 'resolve' ? ('tickets/' + _tkId + '/resolve') : ('tickets/' + _tkId + '/' + action);
    api(path, 'POST', { note: note }).then(function(d) {
      if (d.success) { toast(action === 'approve' ? 'Refund approved!' : action === 'reject' ? 'Rejected' : 'Resolved'); closeModal('ticketModal'); loadTickets(); loadDashboard(); }
      else toast(d.message || 'Failed', 'e');
    }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ POSTS ══════════════════════════════════════════════════════════════ */
  function loadPosts() {
    setT('poTbl', spin());
    var srch = g('poSrch').value, st = g('poSt').value;
    api('requests' + qs({ search: srch, status: st })).then(function(d) {
      var posts = d.requests || [];
      // Enrich with approach credits if available
      setT('poTbl', posts.map(function(p) {
        var cname = p.client ? esc(p.client.name||'-') : '-';
        // creditsRequired: set by admin edit, or from approach creditsSpent, or budget-derived
        var cr = p.creditsRequired || p.creditsSpent || p.credits || 0;
        return '<tr><td style="font-size:13px;font-weight:600">' + esc((p.title||'-').substring(0,40)) + '</td><td>' + uLnk(p.client?p.client._id:'', cname, '#3b82f6') + '</td><td style="font-size:12px">' + esc(p.service||p.category||'-') + '</td><td style="color:#f59e0b">' + (p.budget||'-') + '</td><td>' + bdg(p.status||'open') + '</td><td style="color:#FC8019;font-weight:600">' + cr + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(p.createdAt) + '</td><td><button class="btn bgho" data-edit-post="' + p._id + '">Edit</button></td></tr>';
      }).join(''));
    }).catch(function() { setT('poTbl', ''); });
  }

  function openPostModal(pid) {
    _editPostId = pid;
    api('requests/' + pid).then(function(d) {
      var p = d.request || {};
      g('postTitle').value = p.title || '';
      g('postDesc').value = p.description || '';
      g('postStatus').value = p.status || 'open';
      g('postCredits').value = p.creditsRequired || 0;
      openModal('postModal');
    }).catch(function() { toast('Error loading post', 'e'); });
  }

  function savePost() {
    if (!_editPostId) return;
    // Only send status if user actually has a value selected (avoid defaulting to 'open')
    var statusVal = g('postStatus').value;
    var payload = {
      title: g('postTitle').value,
      description: g('postDesc').value,
      creditsRequired: parseInt(g('postCredits').value) || 0
    };
    if (statusVal) payload.status = statusVal;
    api('requests/' + _editPostId, 'PUT', payload)
      .then(function(d) {
        if (d.success) { toast('Post updated'); closeModal('postModal'); loadPosts(); }
        else toast(d.message || 'Failed', 'e');
      }).catch(function() { toast('Error', 'e'); });
  }

  function deletePost() {
    if (!_editPostId || !confirm('Delete this post permanently?')) return;
    api('requests/' + _editPostId, 'DELETE')
      .then(function(d) {
        if (d.success) { toast('Post deleted'); closeModal('postModal'); loadPosts(); }
        else toast(d.message || 'Failed', 'e');
      }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ REVIEWS ════════════════════════════════════════════════════════════ */
  function loadReviews() {
    setT('rvTbl', spin());
    var srch = g('rvSrch').value;
    api('ratings' + qs({ search: srch })).then(function(d) {
      var reviews = d.ratings || [];
      setT('rvTbl', reviews.map(function(r) {
        var en = r.expert ? esc(r.expert.name||'-') : '-', eid = r.expert ? r.expert._id : '';
        var cl = r.client ? esc(r.client.name||'-') : '-';
        return '<tr><td><span data-uid="' + eid + '" style="cursor:pointer;color:#FC8019;font-weight:600">' + en + '</span></td><td style="color:#a0a0b8">' + cl + '</td><td>' + stars(r.rating||0) + ' <span style="font-size:11px;color:#f59e0b">' + (r.rating||0) + '</span></td><td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis">' + esc((r.review||r.comment||'-').substring(0,80)) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(r.createdAt) + '</td><td><button class="btn brdn" data-del-review="' + r._id + '">Delete</button></td></tr>';
      }).join(''));
    }).catch(function() { setT('rvTbl', ''); });
  }

  /* ═══ REGISTRATIONS ══════════════════════════════════════════════════════ */
  function loadRegistrations() {
    setT('rgTbl', spin());
    var st = g('rgSt').value;
    api('users' + qs({ role: 'expert', registrationStatus: st })).then(function(d) {
      var users = d.users || [];
      /* filter by approval status if field exists */
      if (st !== 'all') {
        users = users.filter(function(u) {
          if (st === 'pending') return !u.isApproved && !u.isRejected && !u.isBanned;
          if (st === 'approved') return u.isApproved;
          if (st === 'rejected') return u.isRejected || u.isBanned;
          return true;
        });
      }
      setT('rgTbl', users.map(function(u) {
        var pr = u.profile || {};
        var actions = '';
        if (!u.isApproved) actions += '<button class="btn bgrn" data-reg-action="' + u._id + '" data-action="approve" data-nm="' + esc(u.name) + '">Approve</button> ';
        if (!u.isBanned) actions += '<button class="btn brdn" data-reg-action="' + u._id + '" data-action="ban" data-nm="' + esc(u.name) + '">Reject</button>';
        var kycCount = [u.aadharDoc, u.panDoc, u.certificateDoc, u.kycDocument, (u.profile&&u.profile.aadhar), (u.profile&&u.profile.pan), (u.profile&&u.profile.certificate)].filter(Boolean).length;
        var kycBtn = kycCount > 0 ? '<button class="btn bpri" data-kyc-uid="' + u._id + '" data-kyc-name="' + esc(u.name) + '">' + kycCount + ' doc' + (kycCount>1?'s':'') + '</button>' : '<span style="font-size:11px;color:#606078">No docs</span>';
        return '<tr><td>' + uLnk(u._id, u.name) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc(u.email) + '</td><td style="font-size:12px">' + (u.phone||'-') + '</td><td style="font-size:12px">' + esc(pr.specialization||u.specialization||'-') + '</td><td>' + kycBtn + '</td><td>' + (u.isApproved ? '<span class="badge bgr">Approved</span>' : u.isBanned ? '<span class="badge brd">Rejected</span>' : '<span class="badge byw">Pending</span>') + '</td><td style="font-size:12px;color:#a0a0b8">' + fmt(u.createdAt) + '</td><td>' + actions + '</td></tr>';
      }).join(''));
    }).catch(function() { setT('rgTbl', ''); });
  }

  /* ═══ PAYMENTS ═══════════════════════════════════════════════════════════ */
  function loadPayments() {
    setT('pyTbl', spin());
    api('payments/failed' + qs({})).then(function(d) {
      var payments = d.payments || [];
      if (!payments.length) { setT('pyTbl', '<tr><td colspan="6" style="text-align:center;padding:30px;color:#606078">No failed payments found</td></tr>'); return; }
      setT('pyTbl', payments.map(function(p) {
        var u = p.user || {};
        return '<tr><td>' + uLnk(u._id||'', u.name||'-') + '<br><small style="color:#606078">' + esc(u.email||'') + '</small></td><td style="color:#ef4444">&#8377;' + (p.amount||0) + '</td><td style="font-size:12px">' + esc(p.gateway||'-') + '</td><td style="font-size:12px;color:#f59e0b">' + esc(p.failureReason||p.reason||'-') + '</td><td style="font-size:12px;color:#a0a0b8">' + fmtT(p.createdAt) + '</td><td><span class="btn bgho" data-uid="' + (u._id||'') + '">Profile</span></td></tr>';
      }).join(''));
    }).catch(function() { setT('pyTbl', '<tr><td colspan="6" style="text-align:center;padding:30px;color:#606078">Payments API not available</td></tr>'); });
  }

  /* ═══ COMMUNICATION ══════════════════════════════════════════════════════ */
  function previewComm() {
    var target = g('commTarget').value;
    var label = { all:'All Users', experts:'All Experts', clients:'All Clients', custom:'Custom List' }[target] || target;
    toast('Will send to: ' + label, 'i');
  }

  function sendComm() {
    var subj = g('commSubj').value.trim();
    var msg = g('commMsg').value.trim();
    var target = g('commTarget').value;
    if (!subj || !msg) { toast('Subject and message required', 'e'); return; }
    var payload = { subject: subj, message: msg, target: target };
    if (target === 'custom') { payload.emails = g('commEmails').value.split(',').map(function(e) { return e.trim(); }).filter(Boolean); }
    g('commStatus').textContent = 'Sending...';
    api('communications/send', 'POST', payload).then(function(d) {
      if (d.success) {
        g('commStatus').textContent = 'Sent to ' + (d.recipientCount || '?') + ' recipients!';
        g('commSubj').value = ''; g('commMsg').value = '';
        loadCommHistory();
      } else { g('commStatus').textContent = 'Failed: ' + (d.message || 'Unknown error'); g('commStatus').style.color = '#ef4444'; }
    }).catch(function() { g('commStatus').textContent = 'Error - check server logs'; g('commStatus').style.color = '#ef4444'; });
  }

  function loadCommHistory() {
    api('communications/history').then(function(d) {
      var logs = d.logs || [];
      setT('commHist', logs.length ? logs.map(function(l) {
        var typeTag = l.type === 'announcement' ? '<span class="badge bo">&#128276; Announcement</span>' : '<span class="badge bgy">&#128140; Email</span>';
        return '<tr><td>' + typeTag + '</td><td style="font-size:13px">' + esc(l.subject||l.title||'-') + '</td><td>' + bdg(l.target||'all') + '</td><td style="color:#22c55e">' + (l.recipientCount||0) + '</td><td style="font-size:12px;color:#a0a0b8">' + fmtT(l.createdAt) + '</td></tr>';
      }).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#606078">No history yet</td></tr>');
    }).catch(function() {});
  }

  /* ═══ INVOICES ═══════════════════════════════════════════════════════════ */
  var _invExpertName = '';

  function loadInvExperts() {
    api('users' + qs({ role: 'expert', limit: 200 })).then(function(d) {
      var sel = g('invUserSel');
      sel.innerHTML = '<option value="">-- Select Expert --</option>';
      (d.users||[]).forEach(function(u) {
        var opt = document.createElement('option');
        opt.value = u._id;
        opt.textContent = u.name + ' (' + (u.email||'') + ')';
        opt.dataset.name = u.name;
        opt.dataset.email = u.email||'';
        opt.dataset.credits = u.credits||0;
        sel.appendChild(opt);
      });
    }).catch(function() {});
  }

  function onInvExpertChange() {
    var sel = g('invUserSel');
    var opt = sel.options[sel.selectedIndex];
    var uid = sel.value;
    var txSel = g('invTxSel');

    if (!uid) {
      txSel.innerHTML = '<option value="">-- Select Expert first --</option>';
      txSel.disabled = true;
      _invExpertName = '';
      g('invPreview').innerHTML = '<div class="empty"><h3>Select expert to preview</h3></div>';
      return;
    }

    _invExpertName = opt.dataset.name || opt.textContent;
    txSel.innerHTML = '<option value="">Loading transactions...</option>';
    txSel.disabled = true;

    // Load expert's purchase transactions
    api('credits/expert/' + uid).then(function(d) {
      var txs = (d.transactions||[]).filter(function(t) { return t.type === 'purchase' || t.type === 'bonus'; });
      txSel.innerHTML = '<option value="">-- Select Transaction (optional) --</option>';
      if (!txs.length) {
        txSel.innerHTML += '<option value="" disabled>No purchases found</option>';
      } else {
        txs.forEach(function(tx) {
          var opt = document.createElement('option');
          opt.value = tx._id;
          var dt = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '';
          var label = dt + ' — ' + esc(tx.description||tx.type) + ' — ' + (tx.amount>0?'+':'') + tx.amount + ' credits';
          opt.textContent = label;
          opt.dataset.amount = tx.amount || 0;
          opt.dataset.desc = tx.description || tx.type || '';
          opt.dataset.date = tx.createdAt ? tx.createdAt.split('T')[0] : '';
          txSel.appendChild(opt);
        });
      }
      txSel.disabled = false;
      previewInvoice();
    }).catch(function() {
      txSel.innerHTML = '<option value="">-- Select Transaction (optional) --</option>';
      txSel.disabled = false;
    });
  }

  function onInvTxChange() {
    var txSel = g('invTxSel');
    var opt = txSel.options[txSel.selectedIndex];
    if (!opt || !opt.value) { previewInvoice(); return; }

    // Auto-fill form fields from selected transaction
    var amt = parseFloat(opt.dataset.amount) || 0;
    var desc = opt.dataset.desc || '';
    var date = opt.dataset.date || '';

    // Convert credits to INR (adjust rate as needed — 1 credit = ₹10 by default)
    var inrAmt = amt * 10;
    g('invAmt').value = inrAmt > 0 ? inrAmt : '';
    if (desc) g('invDesc').value = desc;
    if (date) g('invDate').value = date;

    previewInvoice();
  }

  function previewInvoice() {
    var sel = g('invUserSel');
    var userName = _invExpertName || (sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].dataset.name : '') || 'Expert Name';
    var desc = g('invDesc').value;
    var amt = parseFloat(g('invAmt').value)||0;
    var date = g('invDate').value;
    var due = g('invDue').value;
    var notes = g('invNotes').value;

    if (!userName || userName === 'Expert Name') {
      g('invPreview').innerHTML = '<div class="empty"><h3>Select expert to preview</h3></div>';
      return;
    }

    // Tax rate — custom or preset
    var taxRateSel = g('invTaxRate');
    var taxRate = 18; // default
    if (taxRateSel) {
      var tv = taxRateSel.value;
      if (tv === 'custom') {
        taxRate = parseFloat((g('invCustomTax')&&g('invCustomTax').value)||0) || 0;
      } else {
        taxRate = parseFloat(tv) || 0;
      }
    }
    var inv_no = 'WI-' + Date.now().toString().slice(-6);
    var taxAmt = (amt * taxRate / 100);
    var total = amt + taxAmt;
    var taxLabel = taxRate > 0 ? ('GST / Tax (' + taxRate + '%)') : 'Tax (Exempt)';
    var fmtDate = function(d) { return d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '--'; };
    var fmtMoney = function(v) { return '&#8377;' + v.toFixed(2); };

    g('invPreview').innerHTML = '<div class="inv-preview">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
        '<div><h2 style="font-size:22px;font-weight:800;color:#FC8019;margin-bottom:2px">WorkIndex</h2>' +
        '<div style="font-size:11px;color:#888;font-weight:600;letter-spacing:.08em">TAX INVOICE</div></div>' +
        '<div style="text-align:right;font-size:11px;color:#666">' +
          '<div>Invoice #: <strong style="color:#111">' + inv_no + '</strong></div>' +
          '<div>Date: ' + fmtDate(date) + '</div>' +
          '<div>Due: ' + fmtDate(due) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:14px;padding:10px;background:#f9f9f9;border-radius:6px">' +
        '<div style="font-size:10px;color:#888;font-weight:700;text-transform:uppercase;margin-bottom:4px">Bill To</div>' +
        '<div style="font-weight:700;font-size:14px;color:#111">' + esc(userName) + '</div>' +
      '</div>' +
      '<div class="inv-row" style="font-weight:700;font-size:10px;color:#888;text-transform:uppercase"><span>Description</span><span>Amount</span></div>' +
      '<div class="inv-row"><span>' + esc(desc||'Professional Services') + '</span><span style="color:#111">' + fmtMoney(amt) + '</span></div>' +
      (taxRate > 0 ? '<div class="inv-tax-row"><span style="color:#888">' + taxLabel + '</span><span style="color:#888">' + fmtMoney(taxAmt) + '</span></div>' : '') +
      '<div class="inv-total" style="margin-top:8px;border-top:2px solid #FC8019;padding-top:10px"><span>Total Payable</span><span style="color:#FC8019">' + fmtMoney(total) + '</span></div>' +
      (notes ? '<div style="margin-top:12px;padding:8px;background:#f9f9f9;border-radius:5px;font-size:11px;color:#666"><strong>Notes:</strong> ' + esc(notes) + '</div>' : '') +
      '<div style="margin-top:16px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center">WorkIndex Platform · workindex-frontend.vercel.app</div>' +
    '</div>';
  }

  function genInvoice() {
    var preview = g('invPreview').querySelector('.inv-preview');
    if (!preview) { toast('Select an expert first', 'e'); return; }
    var w = window.open('', '_blank');
    w.document.write('<html><head><title>Invoice - WorkIndex</title><style>' +
      'body{font-family:system-ui;padding:30px;max-width:620px;margin:auto;color:#111}' +
      'h2{color:#FC8019;font-size:22px;font-weight:800;margin:0}' +
      '.inv-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee;font-size:13px}' +
      '.inv-total{display:flex;justify-content:space-between;padding:10px 0;font-weight:800;font-size:16px;border-top:2px solid #FC8019;margin-top:8px}' +
      '@media print{body{padding:10px}}' +
    '</style></head><body>' + g('invPreview').innerHTML + '</body></html>');
    w.document.close();
    setTimeout(function() { w.print(); }, 600);
  }

  /* ═══ ACTIONS ════════════════════════════════════════════════════════════ */
  function searchActions() {
    var srch = g('acSrch').value, role = g('acRole').value;
    setT('acTbl', spin());
    api('users' + qs({ role: role, search: srch })).then(function(d) {
      renderActTbl(d.users||[]);
    }).catch(function() { setT('acTbl', ''); });
  }

  function doAct(uid, act, reason) {
    api('users/' + uid + '/action', 'POST', { action: act, reason: reason || '' }).then(function(d) {
      if (d.success) { toast(d.message); searchActions(); }
      else toast(d.message || 'Failed', 'e');
    }).catch(function() { toast('Error', 'e'); });
  }

  function goActId(uid) {
    goTo('actions');
    setTimeout(function() {
      // Load all users and highlight the one we want
      g('acSrch').value = '';
      g('acRole').value = 'all';
      setT('acTbl', spin());
      api('users' + qs({ search: uid.slice(-8) })).then(function(d) {
        if (!d.success || !(d.users||[]).length) {
          // fallback: load all
          return api('users' + qs({})).then(function(d2) { renderActTbl(d2.users||[]); });
        }
        renderActTbl(d.users||[]);
      }).catch(function() { setT('acTbl', ''); });
    }, 200);
  }

  function renderActTbl(users) {
    setT('acTbl', users.map(function(u) {
      var bb = u.isBanned ? '<button class="btn bgrn" data-act="unban" data-uid="' + u._id + '" data-nm="' + esc(u.name) + '">Unban</button>' : '<button class="btn brdn" data-act="ban" data-uid="' + u._id + '" data-nm="' + esc(u.name) + '">Ban</button>';
      var fb = u.isFlagged ? '<button class="btn bgho" data-act="unflag" data-uid="' + u._id + '" data-nm="' + esc(u.name) + '">Unflag</button>' : '<button class="btn bgho" data-act="flag" data-uid="' + u._id + '" data-nm="' + esc(u.name) + '">Flag</button>';
      return '<tr><td><strong>' + esc(u.name) + '</strong></td><td>' + bdg(u.role) + '</td><td style="font-size:12px;color:#a0a0b8">' + esc(u.email) + '</td><td>' + ust(u) + '</td><td>' + (u.warnings||0) + '</td><td><div style="display:flex;gap:4px;flex-wrap:wrap">' + bb + '<button class="btn bywn" data-act="warn" data-uid="' + u._id + '" data-nm="' + esc(u.name) + '">Warn</button>' + fb + '<span class="btn bgho" data-uid="' + u._id + '">View</span></div></td></tr>';
    }).join(''));
  }

  /* ═══ HEATMAP ════════════════════════════════════════════════════════════ */
  var _hmData = {}, _hmState = null;
  // Indian states with rough SVG positions for bar chart (no external map needed)
  var IN_STATES = ['Maharashtra','Delhi','Karnataka','Tamil Nadu','Uttar Pradesh','Gujarat','Rajasthan','West Bengal','Telangana','Andhra Pradesh','Kerala','Madhya Pradesh','Punjab','Haryana','Bihar','Odisha','Jharkhand','Assam','Chhattisgarh','Uttarakhand','Himachal Pradesh','Goa','Tripura','Manipur','Meghalaya','Nagaland','Arunachal Pradesh','Mizoram','Sikkim','Chandigarh','Puducherry','Jammu and Kashmir','Ladakh'];

  function loadHeatmap() {
    var role = g('hmRole').value;
    g('hmMapArea').innerHTML = '<div style="text-align:center;padding:30px"><div class="spin"></div><div style="margin-top:8px;font-size:12px;color:#606078">Loading location data...</div></div>';
    g('hmBars').innerHTML = '';
    _hmState = null;
    g('hmCrumbs').innerHTML = '<span class="hm-crumb" data-level="country">India</span>';

    // Load users for heatmap - try up to 500 at a time
    var hmRole = role === 'all' ? '' : role;
    var hmQs = '?limit=500' + (hmRole ? '&role=' + hmRole : '') + (dF ? '&from=' + dF : '') + (dT ? '&to=' + dT : '');
    fetch(API + '/users' + hmQs, { headers: { Authorization: 'Bearer ' + tok } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
      var users = d.users || [];
      // ── Location field mapping from index.html questionnaire: ──
      // Expert registration saves to profile.city (plain string e.g. "Bengaluru")
      //   + profile.pincode (6-digit) + profile.serviceLocationType
      // Client questionnaire saves fullAddress: {city,state,pincode,...} 
      //   stored as profile.fullAddress.city / profile.fullAddress.state
      // We use city as the top-level grouping since experts don't have state
      var byState = {};
      users.forEach(function(u) {
        var pr = u.profile || {};
        // Get city from all sources (priority order)
        var city = null;
        var state = null;
        // 1. explicit location fields (if User model has them)
        if (u.location) {
          city  = (u.location.city  || '').trim() || null;
          state = (u.location.state || '').trim() || null;
        }
        // 2. profile.fullAddress (client questionnaire)
        if (!city && pr.fullAddress) {
          city  = (pr.fullAddress.city  || '').trim() || null;
          state = (pr.fullAddress.state || '').trim() || null;
        }
        // 3. profile.city (expert questionnaire — direct string)
        if (!city && pr.city) {
          city = pr.city.trim() || null;
        }
        // 4. profile.state
        if (!state && pr.state) {
          state = pr.state.trim() || null;
        }
        // Group key: use state if available, else city, else 'Unknown'
        var groupKey = state || city || 'Unknown';
        var subKey   = city  || 'Unknown';
        if (!byState[groupKey]) byState[groupKey] = { count: 0, cities: {} };
        byState[groupKey].count++;
        byState[groupKey].cities[subKey] = (byState[groupKey].cities[subKey] || 0) + 1;
      });
      _hmData = { byState: byState, total: users.length, role: role };
      renderHeatmapIndia(byState, users.length);
      renderHmBars(byState, null);
      }).catch(function(err) {
        console.error('Heatmap load error:', err);
        g('hmMapArea').innerHTML = '<div style="text-align:center;padding:30px;color:#606078;font-size:13px">Failed to load data</div>';
      });
  }

  function renderHeatmapIndia(byState, total) {
    var maxVal = 0;
    Object.keys(byState).forEach(function(s) { if (byState[s].count > maxVal) maxVal = byState[s].count; });
    var states = Object.keys(byState).filter(function(s) { return s !== 'Unknown'; }).sort(function(a,b) { return byState[b].count - byState[a].count; });
    var unknownCount = byState['Unknown'] ? byState['Unknown'].count : 0;

    if (!states.length) {
      g('hmMapArea').innerHTML = '<div style="text-align:center;padding:30px;color:#606078;font-size:13px">No location data found.<br><small>Users need to have city/state set in their profile.</small></div>';
      return;
    }

    // Build colored tile grid (reliable, no external deps)
    var html = '<div style="display:flex;flex-wrap:wrap;gap:5px;padding:8px">';
    states.forEach(function(state) {
      var cnt = byState[state].count;
      var pct = maxVal > 0 ? cnt / maxVal : 0;
      var r = Math.round(50 + pct * 202), gv = Math.round(20 + pct * 108), b = Math.round(0 + pct * 25);
      var bg = 'rgb(' + r + ',' + gv + ',' + b + ')';
      var w = Math.max(55, Math.round(45 + pct * 130));
      html += '<div data-hm-state="' + esc(state) + '" style="background:' + bg + ';border-radius:6px;padding:6px 10px;cursor:pointer;width:' + w + 'px;flex-shrink:0;transition:opacity .2s;box-shadow:0 2px 8px rgba(0,0,0,.3)" title="' + esc(state) + ': ' + cnt + '">';
      html += '<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(state.substring(0,14)) + '</div>';
      html += '<div style="font-size:15px;font-weight:800;color:#fff">' + cnt + '</div>';
      html += '</div>';
    });
    html += '</div>';
    if (unknownCount) html += '<div style="font-size:11px;color:#606078;margin-top:6px;padding:0 8px">' + unknownCount + ' users without location</div>';
    html += '<div style="font-size:11px;color:#606078;margin-top:4px;padding:0 8px">Total: <strong style="color:#f0f0f4">' + total + '</strong> &bull; Click a state to see cities</div>';
    g('hmMapArea').innerHTML = html;
    g('hmLegend').innerHTML = '<div class="hm-lswatch" style="background:rgb(50,20,0)"></div><span>Low</span><div class="hm-lswatch" style="background:rgb(150,64,12)"></div><span>Med</span><div class="hm-lswatch" style="background:rgb(252,128,25)"></div><span>High</span>';
    g('hmBarTitle').textContent = 'Top States';
    return; // tile view done — SVG below is kept as reference
    /*
    /*
    var maxVal = 0;
    Object.keys(byState).forEach(function(s) { if (byState[s].count > maxVal) maxVal = byState[s].count; });

    // Build a simple visual grid of states as colored rectangles (no external SVG needed)
    var states = Object.keys(byState).filter(function(s) { return s !== 'Unknown'; }).sort(function(a,b) { return byState[b].count - byState[a].count; });
    var unknownCount = byState['Unknown'] ? byState['Unknown'].count : 0;

    var html = '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px">';
    states.forEach(function(state) {
      var cnt = byState[state].count;
      var pct = maxVal > 0 ? cnt / maxVal : 0;
      // Color intensity: dark orange to bright orange
      var r = Math.round(50 + pct * 202), g2 = Math.round(20 + pct * 108), b = Math.round(0 + pct * 25);
      var bg = 'rgb(' + r + ',' + g2 + ',' + b + ')';
      var w = Math.max(50, Math.round(40 + pct * 120));
      html += '<div data-hm-state="' + esc(state) + '" style="background:' + bg + ';border-radius:5px;padding:5px 8px;cursor:pointer;width:' + w + 'px;min-width:50px;flex-shrink:0;transition:opacity .2s;position:relative" title="' + esc(state) + ': ' + cnt + '">';
      html += '<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,.9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(state.substring(0,14)) + '</div>';
      html += '<div style="font-size:13px;font-weight:800;color:#fff">' + cnt + '</div>';
      html += '</div>';
    });
    html += '</div>';
    if (unknownCount) html += '<div style="font-size:11px;color:#606078;margin-top:6px;padding:0 4px">' + unknownCount + ' users without location data</div>';
    html += '<div style="font-size:11px;color:#606078;margin-top:4px;padding:0 4px">Total: <strong style="color:#f0f0f4">' + total + '</strong> &bull; Click a state to drill down</div>';

    g('hmMapArea').innerHTML = html;
    // Legend
    g('hmLegend').innerHTML = '<div class="hm-lswatch" style="background:rgb(50,20,0)"></div><span>Low</span><div class="hm-lswatch" style="background:rgb(150,64,12)"></div><span>Medium</span><div class="hm-lswatch" style="background:rgb(252,128,25)"></div><span>High</span>';
    g('hmBarTitle').textContent = 'Top States';
  }


  */ }

  function drillHeatmap(state) {
    drillHeatmapState(state); return;
    if (!_hmData.byState || !_hmData.byState[state]) return;
    _hmState = state;
    var cities = _hmData.byState[state].cities;
    var maxVal = 0;
    Object.keys(cities).forEach(function(c) { if (cities[c] > maxVal) maxVal = cities[c]; });

    g('hmCrumbs').innerHTML = '<span class="hm-crumb" data-level="country" style="cursor:pointer">India</span><span class="hm-crumb">' + esc(state) + '</span>';
    g('hmCrumbs').querySelector('[data-level="country"]').onclick = function() {
      _hmState = null;
      g('hmCrumbs').innerHTML = '<span class="hm-crumb" data-level="country">India</span>';
      renderHeatmapIndia(_hmData.byState, _hmData.total);
      renderHmBars(_hmData.byState, null);
    };

    var sorted = Object.keys(cities).filter(function(c) { return c !== 'Unknown'; }).sort(function(a,b) { return cities[b] - cities[a]; });
    var html = '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px">';
    sorted.forEach(function(city) {
      var cnt = cities[city];
      var pct = maxVal > 0 ? cnt / maxVal : 0;
      var r = Math.round(50 + pct * 202), g2 = Math.round(20 + pct * 108), b = Math.round(0 + pct * 25);
      var bg = 'rgb(' + r + ',' + g2 + ',' + b + ')';
      html += '<div style="background:' + bg + ';border-radius:5px;padding:5px 8px;min-width:60px;flex-shrink:0">';
      html += '<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,.9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(city.substring(0,12)) + '</div>';
      html += '<div style="font-size:13px;font-weight:800;color:#fff">' + cnt + '</div>';
      html += '</div>';
    });
    if (cities['Unknown']) html += '<div style="background:#1a1a24;border-radius:5px;padding:5px 8px"><div style="font-size:9px;color:#606078">Unknown</div><div style="font-size:13px;font-weight:800;color:#606078">' + cities['Unknown'] + '</div></div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:#606078;margin-top:6px;padding:0 4px">Total in ' + esc(state) + ': <strong style="color:#f0f0f4">' + _hmData.byState[state].count + '</strong></div>';
    g('hmMapArea').innerHTML = html;
    g('hmBarTitle').textContent = 'Cities in ' + state;
    renderHmBars(null, cities);
  }

  function renderHmBars(byState, byCities) {
    var data = byState || byCities;
    if (!data) { g('hmBars').innerHTML = ''; return; }
    var sorted = Object.keys(data).filter(function(k) { return k !== 'Unknown'; }).sort(function(a,b) {
      var va = byState ? data[a].count : data[a];
      var vb = byState ? data[b].count : data[b];
      return vb - va;
    }).slice(0, 15);
    var maxVal = 0;
    sorted.forEach(function(k) { var v = byState ? data[k].count : data[k]; if (v > maxVal) maxVal = v; });
    g('hmBars').innerHTML = sorted.map(function(k) {
      var v = byState ? data[k].count : data[k];
      var pct = maxVal > 0 ? (v / maxVal * 100) : 0;
      return '<div class="hm-bar-row"><div class="hm-bar-label" title="' + esc(k) + '">' + esc(k) + '</div>' +
        '<div style="flex:1;background:#18181d;border-radius:4px;overflow:hidden"><div class="hm-bar" style="width:' + pct + '%;background:linear-gradient(90deg,#FC8019,#e06b0a)"></div></div>' +
        '<div class="hm-bar-val">' + v + '</div></div>';
    }).join('') || '<div style="color:#606078;font-size:13px;padding:10px">No data</div>';
  }

  /* ═══ DM (DIRECT MESSAGE) ════════════════════════════════════════════════ */
  var _dmUid = null;

  function openDmModal(uid, name) {
    _dmUid = uid;
    g('dmModalInfo').innerHTML = '<strong>' + esc(name) + '</strong><br><span style="color:#a0a0b8;font-size:12px">Message will appear in their chat inbox</span>';
    g('dmText').value = '';
    openModal('dmModal');
  }

  function submitDm() {
    if (!_dmUid) return;
    var text = g('dmText').value.trim();
    if (!text) { toast('Enter a message', 'e'); return; }
    g('dmSubmit').textContent = 'Sending...';
    api('users/' + _dmUid + '/dm', 'POST', { message: text })
      .then(function(d) {
        g('dmSubmit').textContent = '\u2708 Send Message';
        if (d.success) { toast('Message sent!'); closeModal('dmModal'); }
        else toast(d.message || 'Failed to send', 'e');
      }).catch(function() { g('dmSubmit').textContent = '\u2708 Send Message'; toast('Connection error', 'e'); });
  }

  /* ═══ KYC VIEWER ═════════════════════════════════════════════════════════ */
  var _kycUid = null;

  function openKycModal(uid, name) {
    _kycUid = uid;
    g('kycModalTitle').textContent = '\ud83d\udcc4 KYC Documents — ' + name;
    g('kycModalBody').innerHTML = '<div style="text-align:center;padding:24px"><div class="spin"></div></div>';
    openModal('kycModal');
    api('users/' + uid).then(function(d) {
      if (!d.success) { g('kycModalBody').innerHTML = '<p style="color:#606078;padding:16px">Failed to load</p>'; return; }
      var u = d.user;
      var pr = u.profile || {};
      // Collect all possible doc fields
      var docs = [
        { label: 'Aadhar Card', url: u.aadharDoc || pr.aadhar || pr.aadharUrl || pr.aadharDoc || null, icon: '\ud83d\udcb3' },
        { label: 'PAN Card', url: u.panDoc || pr.pan || pr.panUrl || pr.panDoc || null, icon: '\ud83d\udccb' },
        { label: 'Certificate / Degree', url: u.certificateDoc || pr.certificate || pr.certificateUrl || pr.certDoc || null, icon: '\ud83c\udf93' },
        { label: 'KYC Document', url: u.kycDocument || pr.kycDocument || pr.kyc || null, icon: '\ud83d\udcdc' },
        { label: 'Profile Photo', url: u.profilePhoto || null, icon: '\ud83d\uddbc\ufe0f' }
      ];
      // Also check for any array of documents
      var extraDocs = u.documents || pr.documents || [];
      extraDocs.forEach(function(doc, i) {
        var url = typeof doc === 'string' ? doc : (doc.url || doc.path || null);
        var label = typeof doc === 'object' ? (doc.name || doc.label || 'Document ' + (i+1)) : 'Document ' + (i+1);
        docs.push({ label: label, url: url, icon: '\ud83d\udcce' });
      });

      var realDocs = docs.filter(function(d) { return d.url; });
      var html = '';
      if (!realDocs.length) {
        html = '<div class="empty" style="padding:30px"><h3>No documents uploaded</h3><p style="font-size:13px;color:#606078;margin-top:4px">Expert has not uploaded any KYC documents yet</p></div>';
      } else {
        html = '<div style="margin-bottom:14px;font-size:12px;color:#606078">' + realDocs.length + ' document' + (realDocs.length>1?'s':'') + ' found</div>';
        realDocs.forEach(function(doc) {
          var isImg = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(doc.url);
          var isPdf = /\.pdf(\?|$)/i.test(doc.url);
          html += '<div class="kyc-doc">';
          html += '<div class="kyc-doc-icon">' + doc.icon + '</div>';
          html += '<div class="kyc-doc-info"><strong>' + esc(doc.label) + '</strong><small>' + esc(doc.url.substring(0, 60)) + (doc.url.length > 60 ? '...' : '') + '</small></div>';
          html += '<div class="kyc-doc-actions">';
          if (isImg) html += '<button class="btn bgho" onclick="showKycPreview(\'' + esc(doc.url) + '\',\'' + esc(doc.label) + '\')">View</button>';
          else if (isPdf) html += '<a class="btn bgho" href="' + esc(doc.url) + '" target="_blank">Open PDF</a>';
          else html += '<a class="btn bgho" href="' + esc(doc.url) + '" target="_blank">Download</a>';
          html += '</div></div>';
          if (isImg) html += '<div id="kp-' + esc(doc.label.replace(/\s/g,'')) + '" style="display:none;margin-bottom:8px"><img src="' + esc(doc.url) + '" class="kyc-img-preview" onerror="this.style.display=\'none\'"></div>';
        });
      }
      // Basic info strip
      html += '<div style="margin-top:16px;padding:12px;background:#18181d;border-radius:8px;font-size:12px;color:#a0a0b8">';
      html += '<strong style="color:#f0f0f4">' + esc(u.name) + '</strong> &bull; ' + esc(u.email) + ' &bull; ' + (u.phone||'-');
      html += '<br>Status: ' + (u.isApproved ? '<span style="color:#22c55e">Approved</span>' : u.isBanned ? '<span style="color:#ef4444">Rejected</span>' : '<span style="color:#f59e0b">Pending</span>');
      html += '</div>';
      g('kycModalBody').innerHTML = html;
      // Show/hide approve reject based on status
      g('kycApproveBtn').style.display = u.isApproved ? 'none' : 'inline-flex';
      g('kycRejectBtn').style.display = u.isBanned ? 'none' : 'inline-flex';
    }).catch(function() { g('kycModalBody').innerHTML = '<p style="color:#606078;padding:16px">Error loading</p>'; });
  }

  function showKycPreview(url, label) {
    var id = 'kp-' + label.replace(/\s/g,'');
    var el = document.getElementById(id);
    if (el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
  }

  function processKyc(action) {
    if (!_kycUid) return;
    var btnAct = action === 'approve' ? 'approve' : 'ban';
    api('users/' + _kycUid + '/action', 'POST', { action: btnAct })
      .then(function(d) {
        if (d.success) { toast(d.message); closeModal('kycModal'); loadRegistrations(); }
        else toast(d.message || 'Failed', 'e');
      }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══ ANNOUNCEMENT ═══════════════════════════════════════════════════════ */
  function sendAnnouncement() {
    var target = g('annTarget').value;
    var title = g('annTitle').value.trim();
    var msg = g('annMsg').value.trim();
    if (!title || !msg) { toast('Title and message required', 'e'); return; }
    g('annStatus').textContent = 'Sending...';
    g('annStatus').style.color = '#a0a0b8';
    api('communications/announce', 'POST', { target: target, title: title, message: msg })
      .then(function(d) {
        if (d.success) {
          g('annStatus').textContent = 'Sent to ' + (d.recipientCount||'?') + ' users!';
          g('annStatus').style.color = '#22c55e';
          g('annTitle').value = ''; g('annMsg').value = '';
          loadCommHistory();
        } else {
          g('annStatus').textContent = 'Failed: ' + (d.message||'Unknown error');
          g('annStatus').style.color = '#ef4444';
        }
      }).catch(function() { g('annStatus').textContent = 'Connection error'; g('annStatus').style.color = '#ef4444'; });
  }


  /* ═══════════════════════════════════════════════════════════
     TICKET CREATE (admin creates on behalf of user)
  ═══════════════════════════════════════════════════════════ */
  var _tkCreateUid = null, _tkCreateRole = null, _tkSelectedIssue = null;

  var TICKET_CATEGORIES = [
    { group: '🧾 Account & Login Issues', items: [
      'Unable to login', 'Forgot password / OTP not received',
      'Account locked / suspended', 'Change phone/email',
      'Delete account request', 'Profile update issue'
    ]},
    { group: '📋 Request / Job Issues', items: [
      'Unable to post request', 'Edit request issue',
      'Request not visible to experts', 'Wrong category selected',
      'Duplicate request created', 'Want to cancel request',
      'Request marked completed incorrectly', 'Spam responses received'
    ]},
    { group: '💬 Expert Interaction Issues', items: [
      'Expert not responding', 'Received too many responses',
      'Harassment / inappropriate behavior 🚨', 'Expert asking payment outside platform',
      'Expert details incorrect', 'Fake expert suspected'
    ]},
    { group: '💰 Payment & Refund Issues', items: [
      'Payment failed but amount deducted', 'Refund not received',
      'Wrong charge applied', 'Payment confirmation not received',
      'Need invoice / receipt', 'Payment method issue'
    ]},
    { group: '⭐ Review & Rating Issues', items: [
      'Unable to submit review', 'Want to edit/remove review',
      'Fake review posted about me', 'Rating incorrect'
    ]},
    { group: '🛡️ Safety & Abuse', items: [
      'Report fraud/scam 🚨', 'Threatening behavior',
      'Privacy concern', 'Unauthorized use of my data'
    ]},
    { group: '⚙️ Technical Issues', items: [
      'App/website not working', 'Page loading error',
      'Feature not functioning', 'Bug report', 'Mobile app issue'
    ]},
    { group: '❓ General Support', items: [
      'Need help using platform', 'Feature request',
      'Feedback / suggestions', 'Other issue'
    ]}
  ];

  function openCreateTicketModal(uid, name, role) {
    _tkCreateUid = uid; _tkCreateRole = role; _tkSelectedIssue = null;
    g('tkCreateFor').innerHTML = '🎯 Creating ticket on behalf of: <strong style="color:#FC8019">' + esc(name) + '</strong> <span class="badge bgy">' + esc(role||'user') + '</span>';
    // Build category list
    var html = '';
    TICKET_CATEGORIES.forEach(function(cat) {
      html += '<div class="tk-cat-group">' + esc(cat.group) + '</div>';
      cat.items.forEach(function(item) {
        html += '<div class="tk-cat-item" data-issue="' + esc(item) + '">' + esc(item) + '</div>';
      });
    });
    g('tkCatList').innerHTML = html;
    g('tkStep1').style.display = 'block';
    g('tkStep2').style.display = 'none';
    g('tkCreateSubmit').style.display = 'none';
    // Click handler
    g('tkCatList').addEventListener('click', function handler(ev) {
      var item = ev.target.closest('.tk-cat-item');
      if (!item) return;
      // Remove all selected
      document.querySelectorAll('.tk-cat-item').forEach(function(el) { el.classList.remove('sel'); });
      item.classList.add('sel');
      _tkSelectedIssue = item.dataset.issue;
      g('tkSelectedCat').textContent = _tkSelectedIssue;
      g('tkDescription').placeholder = 'Describe the issue in detail for: ' + _tkSelectedIssue;
      g('tkStep1').style.display = 'none';
      g('tkStep2').style.display = 'block';
      g('tkCreateSubmit').style.display = 'inline-flex';
    }, { once: true });
    openModal('tkCreateModal');
  }

  function tkGoBack() {
    g('tkStep1').style.display = 'block';
    g('tkStep2').style.display = 'none';
    g('tkCreateSubmit').style.display = 'none';
    _tkSelectedIssue = null;
    // Re-attach listener
    openCreateTicketModal(_tkCreateUid, g('tkCreateFor').querySelector('strong').textContent, _tkCreateRole);
    closeModal('tkCreateModal'); openModal('tkCreateModal');
  }

  function submitCreateTicket() {
    if (!_tkCreateUid || !_tkSelectedIssue) { toast('Select an issue first', 'e'); return; }
    var payload = {
      userId: _tkCreateUid,
      subject: _tkSelectedIssue,
      description: g('tkDescription').value || _tkSelectedIssue,
      priority: g('tkPriority').value,
      adminNote: g('tkAdminNote').value,
      createdByAdmin: true
    };
    api('tickets/create-for-user', 'POST', payload).then(function(d) {
      if (d.success) {
        toast('Ticket created: #' + (d.ticket&&d.ticket._id||'').slice(-6).toUpperCase());
        closeModal('tkCreateModal');
        loadTickets();
      } else toast(d.message||'Failed to create ticket', 'e');
    }).catch(function() { toast('Error creating ticket', 'e'); });
  }

  /* ═══════════════════════════════════════════════════════════
     SETTINGS TAB
  ═══════════════════════════════════════════════════════════ */
  function loadSettingsTab() {
    // Show API URL
    if (g('settApiUrl')) g('settApiUrl').value = API;
    // Show admin info
    if (g('settAdminInfo')) {
      g('settAdminInfo').innerHTML =
        '<strong>' + esc((adm&&adm.adminId)||(adm&&adm.name)||'Admin') + '</strong>' +
        '<div style="color:#606078;margin-top:4px;font-size:12px">Last login: ' + ((adm&&adm.lastLogin) ? new Date(adm.lastLogin).toLocaleString('en-IN') : 'N/A') + '</div>';
    }
    // Load platform stats
    loadSettingsStats();
    // Password change
    if (g('settSavePwBtn')) {
      g('settSavePwBtn').onclick = function() {
        var old = g('settOldPw').value, nw = g('settNewPw').value, nw2 = g('settNewPw2').value;
        if (!old || !nw || !nw2) { toast('Fill all password fields', 'e'); return; }
        if (nw !== nw2) { toast('Passwords do not match', 'e'); return; }
        if (nw.length < 8) { toast('Password must be 8+ characters', 'e'); return; }
        api('settings/change-password', 'POST', { currentPassword: old, newPassword: nw })
          .then(function(d) {
            if (d.success) { toast('Password updated'); g('settOldPw').value=''; g('settNewPw').value=''; g('settNewPw2').value=''; }
            else toast(d.message||'Failed', 'e');
          }).catch(function() { toast('Error', 'e'); });
      };
    }
    if (g('settRefreshStats')) g('settRefreshStats').onclick = loadSettingsStats;
  }

  function loadSettingsStats() {
    if (!g('settStats')) return;
    g('settStats').innerHTML = '<div class="spin"></div>';
    api('stats' + qs({})).then(function(d) {
      if (!d.success) { g('settStats').innerHTML = '<p style="color:#606078;text-align:center">Could not load stats</p>'; return; }
      var s = d.stats || {};
      var cr = s.credits || {};
      var items = [
        { label: 'Total Experts', val: s.totalExperts||0, color: '#FC8019' },
        { label: 'Total Clients', val: s.totalClients||0, color: '#3b82f6' },
        { label: 'Requests', val: s.totalRequests||0, color: '#f0f0f4' },
        { label: 'Approaches', val: s.totalApproaches||0, color: '#f0f0f4' },
        { label: 'Credits Spent', val: cr.totalSpent||0, color: '#f59e0b' },
        { label: 'Credits Refunded', val: cr.totalRefunded||0, color: '#a855f7' }
      ];
      g('settStats').innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        items.map(function(it) {
          return '<div style="background:#18181d;border-radius:8px;padding:10px"><div style="font-size:10px;color:#606078;text-transform:uppercase;margin-bottom:4px">' + it.label + '</div><div style="font-size:20px;font-weight:800;color:' + it.color + '">' + it.val + '</div></div>';
        }).join('') + '</div>';
    }).catch(function() { g('settStats').innerHTML = '<p style="color:#606078;text-align:center">Could not load stats</p>'; });
  }

  function dangerAction(action) {
    var msgs = { clearLogs: 'Clear all communication logs older than 90 days?', clearFailedPayments: 'Clear all failed payment logs?' };
    if (!confirm(msgs[action]||'Are you sure?')) return;
    api('settings/danger/' + action, 'POST', {}).then(function(d) {
      toast(d.message||'Done');
    }).catch(function() { toast('Error', 'e'); });
  }

  /* ═══════════════════════════════════════════════════════════
     INVOICE — TAX RATE TOGGLE
  ═══════════════════════════════════════════════════════════ */
  function initInvoiceTaxToggle() {
    var sel = g('invTaxRate');
    if (!sel) return;
    sel.addEventListener('change', function() {
      var box = g('invCustomTaxBox');
      if (box) box.style.display = this.value === 'custom' ? 'block' : 'none';
      previewInvoice();
    });
    var customInput = g('invCustomTax');
    if (customInput) customInput.addEventListener('input', previewInvoice);
  }

  /* ═══════════════════════════════════════════════════════════
     INDIA SVG CHOROPLETH HEATMAP
     Proper state paths — replaces the tile grid approach
  ═══════════════════════════════════════════════════════════ */
  // Full India SVG viewBox path data for all states
  // Using simplified but geographically accurate paths
  var INDIA_STATES_SVG = {
    viewBox: "0 0 950 1050",
    states: [
      { id: "Jammu & Kashmir", name: "Jammu & Kashmir", abbr: "J&K", d: "M 285 30 L 320 25 L 365 45 L 385 80 L 360 110 L 330 125 L 295 115 L 270 85 Z" },
      { id: "Himachal Pradesh", name: "Himachal Pradesh", abbr: "HP", d: "M 320 115 L 370 108 L 390 135 L 370 165 L 335 160 L 318 140 Z" },
      { id: "Punjab", name: "Punjab", abbr: "PB", d: "M 265 120 L 320 115 L 318 140 L 300 158 L 270 155 L 255 138 Z" },
      { id: "Haryana", name: "Haryana", abbr: "HR", d: "M 285 158 L 330 155 L 340 185 L 318 205 L 288 198 L 278 178 Z" },
      { id: "Delhi", name: "Delhi", abbr: "DL", d: "M 318 185 L 335 182 L 338 198 L 322 202 Z" },
      { id: "Rajasthan", name: "Rajasthan", abbr: "RJ", d: "M 190 170 L 280 158 L 290 200 L 280 270 L 240 320 L 188 310 L 158 268 L 162 210 Z" },
      { id: "Uttar Pradesh", name: "Uttar Pradesh", abbr: "UP", d: "M 335 180 L 445 168 L 490 200 L 480 265 L 430 295 L 360 285 L 320 255 L 308 215 Z" },
      { id: "Uttarakhand", name: "Uttarakhand", abbr: "UK", d: "M 370 148 L 420 142 L 450 168 L 415 185 L 380 178 Z" },
      { id: "Bihar", name: "Bihar", abbr: "BR", d: "M 490 200 L 560 195 L 580 235 L 555 265 L 500 260 L 482 235 Z" },
      { id: "Jharkhand", name: "Jharkhand", abbr: "JH", d: "M 500 265 L 562 268 L 575 310 L 545 340 L 500 335 L 482 300 Z" },
      { id: "West Bengal", name: "West Bengal", abbr: "WB", d: "M 580 220 L 620 215 L 645 260 L 630 320 L 595 350 L 565 310 L 580 270 Z" },
      { id: "Sikkim", name: "Sikkim", abbr: "SK", d: "M 620 195 L 640 190 L 645 210 L 625 215 Z" },
      { id: "Assam", name: "Assam", abbr: "AS", d: "M 650 215 L 720 210 L 740 240 L 710 265 L 660 258 L 645 238 Z" },
      { id: "Arunachal Pradesh", name: "Arunachal Pradesh", abbr: "AR", d: "M 660 165 L 760 158 L 785 195 L 740 210 L 655 210 Z" },
      { id: "Meghalaya", name: "Meghalaya", abbr: "ML", d: "M 655 268 L 710 265 L 720 292 L 685 300 L 655 288 Z" },
      { id: "Nagaland", name: "Nagaland", abbr: "NL", d: "M 740 240 L 775 235 L 780 262 L 748 268 L 740 255 Z" },
      { id: "Manipur", name: "Manipur", abbr: "MN", d: "M 748 268 L 780 265 L 785 295 L 758 305 L 742 290 Z" },
      { id: "Tripura", name: "Tripura", abbr: "TR", d: "M 690 305 L 715 300 L 718 328 L 695 332 Z" },
      { id: "Mizoram", name: "Mizoram", abbr: "MZ", d: "M 718 310 L 748 308 L 752 340 L 722 345 Z" },
      { id: "Madhya Pradesh", name: "Madhya Pradesh", abbr: "MP", d: "M 230 310 L 370 290 L 440 310 L 450 370 L 410 420 L 320 435 L 235 420 L 200 370 L 208 330 Z" },
      { id: "Gujarat", name: "Gujarat", abbr: "GJ", d: "M 125 295 L 192 312 L 205 370 L 195 420 L 160 455 L 110 465 L 80 440 L 70 390 L 90 340 Z" },
      { id: "Maharashtra", name: "Maharashtra", abbr: "MH", d: "M 195 425 L 315 438 L 370 455 L 380 520 L 340 570 L 270 585 L 200 565 L 162 510 L 158 458 Z" },
      { id: "Chhattisgarh", name: "Chhattisgarh", abbr: "CG", d: "M 450 375 L 535 368 L 555 430 L 520 480 L 460 475 L 435 430 Z" },
      { id: "Odisha", name: "Odisha", abbr: "OD", d: "M 540 345 L 600 340 L 625 390 L 610 445 L 565 465 L 525 445 L 520 395 Z" },
      { id: "Telangana", name: "Telangana", abbr: "TS", d: "M 355 575 L 440 565 L 475 600 L 460 650 L 400 658 L 355 630 L 342 600 Z" },
      { id: "Andhra Pradesh", name: "Andhra Pradesh", abbr: "AP", d: "M 420 580 L 570 555 L 600 600 L 580 660 L 520 695 L 450 685 L 408 648 L 424 608 Z" },
      { id: "Karnataka", name: "Karnataka", abbr: "KA", d: "M 200 595 L 345 585 L 365 640 L 345 700 L 295 730 L 230 720 L 185 680 L 175 635 Z" },
      { id: "Goa", name: "Goa", abbr: "GA", d: "M 162 590 L 198 585 L 202 612 L 168 618 Z" },
      { id: "Tamil Nadu", name: "Tamil Nadu", abbr: "TN", d: "M 295 735 L 375 710 L 430 750 L 420 830 L 375 880 L 320 870 L 275 810 L 268 760 Z" },
      { id: "Kerala", name: "Kerala", abbr: "KL", d: "M 222 730 L 290 738 L 285 830 L 258 880 L 215 850 L 200 790 L 208 755 Z" },
      { id: "Lakshadweep", name: "Lakshadweep", abbr: "LD", d: "M 120 780 L 130 780 L 132 792 L 120 792 Z" },
      { id: "Andaman & Nicobar", name: "Andaman & Nicobar", abbr: "AN", d: "M 790 580 L 800 575 L 808 615 L 796 618 Z" }
    ]
  };

  function renderIndiaSvgMap(byState, total) {
    var stateData = byState || {};
    var maxCount = 0;
    Object.keys(stateData).forEach(function(s) {
      if (stateData[s] && stateData[s].count > maxCount) maxCount = stateData[s].count;
    });

    var svgPaths = INDIA_STATES_SVG.states.map(function(st) {
      // Try to match by exact name, then by abbr
      var data = stateData[st.name] || stateData[st.id] || stateData[st.abbr] || null;
      // Also try city-level match (experts stored by city)
      if (!data) {
        var firstWord = st.name.toLowerCase().split(' ')[0];
        Object.keys(stateData).forEach(function(k) {
          if (k.toLowerCase().indexOf(firstWord) >= 0) data = stateData[k];
        });
      }
      // Also try matching city data directly to state (experts store by city name)
      if (!data) {
        Object.keys(stateData).forEach(function(k) {
          var kl = k.toLowerCase();
          var nl = st.name.toLowerCase();
          if (kl === nl || nl.indexOf(kl) >= 0) data = stateData[k];
        });
      }
      var count = data ? data.count : 0;
      var intensity = maxCount > 0 ? count / maxCount : 0;
      // Color: dark (#1a1a24) to orange (#FC8019)
      var r = Math.round(26 + intensity * (252-26));
      var g2 = Math.round(26 + intensity * (128-26));
      var b = Math.round(36 + intensity * (25-36));
      var fill = count > 0 ? ('rgb('+r+','+g2+','+b+')') : '#1a1a24';
      var opacity = count > 0 ? (0.4 + intensity * 0.6) : 0.5;
      return '<path class="hm-state" id="hms-' + st.abbr + '" d="' + st.d + '" fill="' + fill + '" opacity="' + opacity + '" data-state="' + esc(st.name) + '" data-count="' + count + '" data-abbr="' + st.abbr + '"><title>' + esc(st.name) + ': ' + count + ' users</title></path>' +
        (count > 0 ? '<text x="' + svgCentroid(st.d).x + '" y="' + (svgCentroid(st.d).y+4) + '" text-anchor="middle" fill="white" font-size="7" font-weight="700" pointer-events="none" style="text-shadow:0 1px 2px rgba(0,0,0,.8)">' + st.abbr + '</text><text x="' + svgCentroid(st.d).x + '" y="' + (svgCentroid(st.d).y+14) + '" text-anchor="middle" fill="rgba(255,255,255,.85)" font-size="6" pointer-events="none">' + count + '</text>' : '<text x="' + svgCentroid(st.d).x + '" y="' + (svgCentroid(st.d).y+4) + '" text-anchor="middle" fill="rgba(150,150,180,.4)" font-size="6" pointer-events="none">' + st.abbr + '</text>');
    }).join('');

    return '<svg id="indiaSvgMap" viewBox="' + INDIA_STATES_SVG.viewBox + '" style="width:100%;max-height:500px;cursor:pointer" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="950" height="1050" fill="#0d0d14" rx="10"/>' +
      svgPaths +
      '</svg>' +
      '<div id="hmTip" style="position:fixed;background:#111115;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:8px 12px;font-size:12px;pointer-events:none;display:none;z-index:9999;min-width:130px;box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>';
  }

  function svgCentroid(d) {
    // Rough centroid from path data
    var nums = d.match(/[\d.]+/g)||[];
    var xs = [], ys = [];
    for (var i=0; i<nums.length-1; i+=2) { xs.push(parseFloat(nums[i])); ys.push(parseFloat(nums[i+1])); }
    var cx = xs.reduce(function(a,b){return a+b;},0)/xs.length;
    var cy = ys.reduce(function(a,b){return a+b;},0)/ys.length;
    return { x: Math.round(cx), y: Math.round(cy) };
  }

  function attachSvgMapEvents() {
    var svg = document.getElementById('indiaSvgMap');
    if (!svg) return;
    var tip = document.getElementById('hmTip');
    svg.querySelectorAll('.hm-state').forEach(function(path) {
      path.addEventListener('mouseenter', function(ev) {
        var cnt = parseInt(this.dataset.count)||0;
        if (tip) {
          tip.innerHTML = '<strong>' + esc(this.dataset.state) + '</strong><br>' + cnt + ' users';
          tip.style.display = 'block';
        }
      });
      path.addEventListener('mousemove', function(ev) {
        if (tip) { tip.style.left = (ev.clientX+12)+'px'; tip.style.top = (ev.clientY-10)+'px'; }
      });
      path.addEventListener('mouseleave', function() {
        if (tip) tip.style.display = 'none';
      });
      path.addEventListener('click', function() {
        if (tip) tip.style.display = 'none';
        drillHeatmapState(this.dataset.state);
      });
    });
  }

  function drillHeatmapState(stateName) {
    if (!_hmData || !_hmData.byState) return;
    var data = _hmData.byState[stateName];
    if (!data || !data.cities) {
      toast('No city data for ' + stateName);
      return;
    }
    _hmState = stateName;
    g('hmCrumbs').innerHTML = '<span class="hm-crumb" data-level="country" style="cursor:pointer">India</span><span class="hm-crumb"> › ' + esc(stateName) + '</span>';
    // Build city breakdown
    var cities = data.cities;
    var sorted = Object.keys(cities).sort(function(a,b){return cities[b]-cities[a];});
    var maxC = cities[sorted[0]]||1;
    var cityHtml = sorted.map(function(city) {
      var cnt = cities[city];
      var w = Math.max(4, Math.round((cnt/maxC)*200));
      return '<div class="hm-bar-row"><div class="hm-bar-label">' + esc(city) + '</div>' +
        '<div class="hm-bar" style="width:'+w+'px;background:linear-gradient(90deg,#FC8019,#e06b0a)"></div>' +
        '<div class="hm-bar-val">' + cnt + '</div></div>';
    }).join('');
    g('hmMapArea').innerHTML = '<div style="padding:10px">' +
      '<div style="font-size:13px;font-weight:700;margin-bottom:12px;color:#FC8019">Cities in ' + esc(stateName) + '</div>' +
      (sorted.length ? cityHtml : '<p style="color:#606078">No city data available</p>') +
      '</div>';
    g('hmBarTitle').textContent = 'Cities in ' + stateName;
    // Update bar chart with city data
    renderHmBars({}, cities);
  }

})();
