// ===== 三国人物性格测试 · 应用逻辑 =====
(function () {
  'use strict';

  // ---- 状态 ----
  var state = { mode: 'work', answers: [], idx: 0 };

  // ---- DOM 快捷 ----
  var $ = function (id) { return document.getElementById(id); };
  var views = { home: $('view-home'), quiz: $('view-quiz'), result: $('view-result') };

  // ================= 页面切换 =================
  function showView(name) {
    Object.keys(views).forEach(function (k) { views[k].classList.remove('active'); });
    views[name].classList.add('active');
    window.scrollTo(0, 0);
  }

  // ================= 首页 =================
  document.querySelectorAll('.entry-item').forEach(function (el) {
    el.addEventListener('click', function () {
      state.mode = el.getAttribute('data-mode');
      state.answers = [];
      state.idx = 0;
      startQuiz();
    });
  });

  // ================= 答题页 =================
  function startQuiz() {
    showView('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    var q = QUESTIONS[state.mode][state.idx];
    var total = QUESTIONS[state.mode].length;
    $('quizProgressText').textContent = (state.idx + 1) + ' / ' + total;
    $('quizProgressFill').style.width = ((state.idx + 1) / total * 100) + '%';
    $('quizQnum').textContent = '第 ' + (state.idx + 1) + ' 题';
    $('quizQuestion').textContent = q.q;
    var box = $('quizOptions');
    box.innerHTML = '';
    q.options.forEach(function (opt, i) {
      var div = document.createElement('div');
      div.className = 'option';
      div.textContent = opt.t;
      div.addEventListener('click', function () {
        state.answers.push(i);
        if (state.idx + 1 >= total) { finishQuiz(); }
        else { state.idx++; renderQuestion(); }
      });
      box.appendChild(div);
    });
  }

  // ================= 判分 =================
  function scoreRaw() {
    var raw = { 决断: 0, 谋略: 0, 仁德: 0, 勇武: 0, 隐忍: 0, 才情: 0 };
    QUESTIONS[state.mode].forEach(function (q, i) {
      var opt = q.options[state.answers[i]];
      Object.keys(opt.s).forEach(function (dim) { raw[dim] += opt.s[dim]; });
    });
    return raw;
  }

  function normVector(raw) {
    var max = MAX_SCORE[state.mode];
    var norm = {};
    DIMS.forEach(function (d) { norm[d] = raw[d] / max[d]; });
    return norm;
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < 6; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function computeMatch() {
    var norm = normVector(scoreRaw());
    var normArr = DIMS.map(function (d) { return norm[d]; });
    var ranked = PERSONS.map(function (p) {
      return { p: p, sim: cosine(normArr, p.vec) };
    }).sort(function (a, b) { return b.sim - a.sim; });

    var top1 = ranked[0], top2 = ranked[1], top3 = ranked[2];
    var score = Math.min(98, Math.round(45 + Math.pow(top1.sim, 2.2) * 50));
    var delta = top1.sim - top2.sim;
    var level, hint;
    if (delta >= 0.08) { level = 'high'; hint = '性格特征高度鲜明，你的三国本命相当明确'; }
    else if (delta >= 0.03) { level = 'mid'; hint = '性格画像存在双子星，主结果与备选非常接近'; }
    else { level = 'low'; hint = '你的性格维度比较均衡，可再测一次确认'; }
    return { top1: top1, top2: top2, top3: top3, score: score, delta: delta, level: level, hint: hint };
  }

  // ================= 结果页 =================
  function finishQuiz() {
    showView('result');
    $('resultLoading').classList.remove('hidden');
    $('resultBody').classList.add('hidden');
    setTimeout(function () {
      var m = computeMatch();
      renderResult(m);
    }, 600);
  }

  function renderResult(m) {
    $('resultLoading').classList.add('hidden');
    $('resultBody').classList.remove('hidden');
    var p = m.top1.p;

    $('scoreNum').textContent = m.score;
    $('resultName').textContent = p.name;
    $('resultTags').innerHTML = p.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    $('resultImg').src = p.img;
    $('resultImg').alt = p.name;

    // 六维条形图
    var bars = $('resultBars');
    bars.innerHTML = '';
    DIMS.forEach(function (d, i) {
      var row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML =
        '<div class="bar-label">' + d + '</div>' +
        '<div class="bar-track"><div class="bar-fill" data-val="' + (p.vec[i] / 5 * 100) + '"></div></div>' +
        '<div class="bar-val">' + p.vec[i] + '</div>';
      bars.appendChild(row);
    });
    setTimeout(function () {
      bars.querySelectorAll('.bar-fill').forEach(function (f) { f.style.width = f.getAttribute('data-val') + '%'; });
    }, 50);

    $('resultInterp').textContent = p.interp;
    $('resultCommon').textContent = p.common;
    $('resultBehavior').textContent = p.behavior;
    $('resultRisk').textContent = p.risk;
    $('resultLine').textContent = '「' + p.line + '」';

    // 双结果提示
    var altBox = $('resultAlt');
    if (altBox) altBox.remove();
    if (m.level !== 'high') {
      var alt = document.createElement('div');
      alt.id = 'resultAlt';
      alt.className = 'result-section alt-card';
      alt.innerHTML =
        '<div class="section-title">备选本命（' + m.hint + '）</div>' +
        '<div class="alt-name">' + m.top2.p.name + ' <span class="alt-tags">' + m.top2.p.tags.join(' / ') + '</span></div>';
      $('resultLine').after(alt);
    }

    // 置信度提示行
    var hintLine = document.createElement('div');
    hintLine.className = 'confidence-hint';
    hintLine.textContent = m.hint;
    $('resultScoreWrap') && 0;
    var scoreWrap = document.querySelector('.result-score');
    if (scoreWrap) {
      var old = document.querySelector('.confidence-hint');
      if (old) old.remove();
      scoreWrap.insertAdjacentElement('afterend', hintLine);
    }

    $('btnSave').onclick = function () { generateImage(m); };
  }

  // ================= Canvas 总结图 =================
  function generateImage(m) {
    var btn = $('btnSave');
    btn.textContent = '生成中…';
    btn.disabled = true;
    var p = m.top1.p;
    var img = new Image();
    img.onload = function () { drawCanvas(m, p, img, btn); };
    img.onerror = function () { drawCanvas(m, p, null, btn); };
    img.src = p.img;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var lines = [];
    var chars = String(text).split('');
    var line = '';
    for (var i = 0; i < chars.length; i++) {
      line += chars[i];
      if (ctx.measureText(line).width > maxWidth) {
        lines.push(line.slice(0, -1));
        line = chars[i];
      }
    }
    lines.push(line);
    lines.forEach(function (l, idx) {
      ctx.fillText(l, x, y + idx * lineHeight);
    });
    return lines.length * lineHeight;
  }

  function drawCanvas(m, p, portrait, btn) {
    var W = 750;
    var canvas = $('resultCanvas');
    canvas.width = W;
    var ctx = canvas.getContext('2d');

    // ---- 文案换行（限制最多 3 行，超出用 … 截断）----
    ctx.font = '25px sans-serif';
    var maxTextW = W - 140;
    function wrapLines(text, maxLines) {
      var chars = String(text).split('');
      var lines = [];
      var line = '';
      for (var i = 0; i < chars.length; i++) {
        var test = line + chars[i];
        if (ctx.measureText(test).width > maxTextW) {
          lines.push(line);
          line = chars[i];
          if (lines.length >= maxLines) {
            lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
            return lines;
          }
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    var commonLines = wrapLines(p.common, 3);
    var behaviorLines = wrapLines(p.behavior, 3);
    var riskLines = wrapLines(p.risk, 3);

    // ---- 动态画布高度 ----
    var headH = 860;
    var barH = 30 + 22 + 46 * 6 + 46;
    var sectionH = 0;
    [commonLines, behaviorLines, riskLines].forEach(function (ls) {
      sectionH += ls.length * 36 + 60;
    });
    var tailH = 30 + 50 + 80;
    var H = headH + barH + sectionH + tailH;
    canvas.height = H;

    // ---- 背景 ----
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#241546');
    bg.addColorStop(0.55, '#2b1b4e');
    bg.addColorStop(1, '#191030');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 装饰圆
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#e0b3ff';
    ctx.beginPath(); ctx.arc(650, 160, 180, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(70, H - 170, 220, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    var modeName = state.mode === 'work' ? '职场版' : '学生版';

    // 顶部标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cbb8ff';
    ctx.font = '26px sans-serif';
    ctx.fillText('三国人物性格测试 · ' + modeName, W / 2, 70);

    // 匹配度
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '30px sans-serif';
    ctx.fillText('本命匹配度', W / 2, 150);
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 120px sans-serif';
    ctx.fillText(m.score + '%', W / 2, 280);

    // 人物名
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(p.name, W / 2, 370);

    // 标签
    var tagY = 420;
    var chipW = 150, chipH = 46, gap = 18;
    var totalW = p.tags.length * chipW + (p.tags.length - 1) * gap;
    var startX = (W - totalW) / 2;
    ctx.font = '24px sans-serif';
    p.tags.forEach(function (t, i) {
      var x = startX + i * (chipW + gap);
      ctx.fillStyle = 'rgba(224,179,255,.16)';
      roundRect(ctx, x, tagY - 33, chipW, chipH, 23);
      ctx.fill();
      ctx.strokeStyle = 'rgba(224,179,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#e0b3ff';
      ctx.fillText(t, x + chipW / 2, tagY + 2);
    });

    // 头像
    var portY = 500;
    if (portrait && portrait.width > 0) {
      var pw = 300;
      var ph = 300 * (portrait.height / portrait.width);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.4)';
      ctx.shadowBlur = 30;
      roundRect(ctx, (W - pw) / 2, portY, pw, ph, 20);
      ctx.clip();
      ctx.drawImage(portrait, (W - pw) / 2, portY, pw, ph);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 3;
      roundRect(ctx, (W - pw) / 2, portY, pw, ph, 20);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(ctx, (W - 300) / 2, portY, 300, 300, 20);
      ctx.fill();
      ctx.fillStyle = '#cbb8ff';
      ctx.font = '40px sans-serif';
      ctx.fillText(p.name + ' 画像', W / 2, portY + 160);
    }

    var y = portY + 360;

    // 六维条形
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('性格六维', 70, y);
    y += 22;
    DIMS.forEach(function (d, i) {
      y += 46;
      ctx.fillStyle = '#cbb8ff';
      ctx.font = '24px sans-serif';
      ctx.fillText(d, 70, y + 8);
      var trackX = 170, trackW = 450;
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      roundRect(ctx, trackX, y - 12, trackW, 24, 12);
      ctx.fill();
      var fillW = trackW * (p.vec[i] / 5);
      var grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
      grad.addColorStop(0, '#ffd98a');
      grad.addColorStop(1, '#e0b3ff');
      ctx.fillStyle = grad;
      roundRect(ctx, trackX, y - 12, fillW, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#ffd98a';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(p.vec[i], W - 70, y + 8);
      ctx.textAlign = 'left';
    });

    y += 46;

    // 文案区块
    function textSection(title, lines) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(title, 70, y);
      y += 20;
      ctx.font = '25px sans-serif';
      ctx.fillStyle = '#ddd2f5';
      ctx.textAlign = 'left';
      lines.forEach(function (l) {
        ctx.fillText(l, 70, y + 28);
        y += 36;
      });
      y += 10;
      return y;
    }
    y = textSection('共同底色', commonLines);
    y = textSection('现实行为映射', behaviorLines);
    y = textSection('风险提醒', riskLines);

    // 台词
    y += 30;
    ctx.fillStyle = 'rgba(255,217,138,.9)';
    ctx.font = 'italic 27px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('「' + p.line + '」', W / 2, y);
    y += 50;

    // 水印
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = '22px sans-serif';
    ctx.fillText('扫码或微信内即测 · 三国人物性格测试', W / 2, y + 30);

    canvas.classList.remove('hidden');
    canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 转图片供长按保存
    var dataURL = canvas.toDataURL('image/png');
    var img = document.createElement('img');
    img.id = 'saveImage';
    img.src = dataURL;
    img.style.cssText = 'width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin-top:16px;';
    var wrap = document.querySelector('.result-actions');
    var old = document.getElementById('saveImage');
    if (old) old.remove();
    wrap.insertAdjacentElement('afterend', img);
    btn.textContent = '已生成，长按图片保存';
    btn.disabled = false;

    // 自动下载（桌面浏览器）
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = '三国人物-' + p.name + '-测试结果.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 重新测试
  $('btnRetry').addEventListener('click', function () {
    state.answers = [];
    state.idx = 0;
    var img = document.getElementById('saveImage');
    if (img) img.remove();
    $('resultCanvas').classList.add('hidden');
    showView('home');
  });

  window.APP = { computeMatch: computeMatch };
})();
