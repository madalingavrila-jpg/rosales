(function () {
  const fmt = new Intl.NumberFormat("ro-RO");
  const pct = new Intl.NumberFormat("ro-RO", {
    style: "percent",
    maximumFractionDigits: 0,
  });

  const els = {
    loading: document.getElementById("loading"),
    userChip: document.getElementById("user-chip"),
    syncMeta: document.getElementById("sync-meta"),
    periodLabel: document.getElementById("period-label"),
    activationsTotal: document.getElementById("activations-total"),
    activationsTeams: document.getElementById("activations-teams"),
    kpiGrid: document.getElementById("kpi-grid"),
    stageChart: document.getElementById("stage-chart"),
    trendChart: document.getElementById("trend-chart"),
    repTableBody: document.querySelector("#rep-table tbody"),
    logoutBtn: document.getElementById("logout-btn"),
  };

  const KPI_DEFS = [
    { key: "opportunitiesToday", label: "Azi", hint: "Oportunități noi", accent: true },
    { key: "closedWonMonth", label: "Closed Won", hint: "Luna curentă", success: true },
    { key: "closedLostMonth", label: "Closed Lost", hint: "Luna curentă", danger: true },
    { key: "activatedMonth", label: "Activated", hint: "Luna curentă" },
    { key: "activePipeline", label: "Pipeline activ", hint: "Excl. Not Working" },
    { key: "totalOpportunitiesMonth", label: "Total oportunități", hint: "Luna curentă" },
  ];

  function showLoading(on) {
    els.loading.classList.toggle("visible", on);
  }

  function progressClass(pctValue) {
    if (pctValue >= 100) return "complete";
    if (pctValue >= 75) return "good";
    if (pctValue >= 40) return "mid";
    return "low";
  }

  function renderProgressBar(actual, target, pctValue) {
    const width = Math.min(100, target > 0 ? (actual / target) * 100 : 0);
    const cls = progressClass(pctValue);
    return `<div class="progress-track" role="progressbar" aria-valuenow="${actual}" aria-valuemin="0" aria-valuemax="${target}">
      <div class="progress-fill ${cls}" style="width:${width}%"></div>
    </div>`;
  }

  function renderActivationsTotal(kpi) {
    els.activationsTotal.innerHTML = `
      <div class="activations-total-head">
        <div>
          <div class="activations-label">Total activări echipă</div>
          <div class="activations-value">
            <span class="actual">${fmt.format(kpi.totalActual)}</span>
            <span class="sep">/</span>
            <span class="target">${fmt.format(kpi.totalTarget)}</span>
          </div>
        </div>
        <div class="activations-pct ${progressClass(kpi.progressPct)}">${kpi.progressPct}%</div>
      </div>
      ${renderProgressBar(kpi.totalActual, kpi.totalTarget, kpi.progressPct)}
      <div class="activations-hint">Țintă = suma țintelor per rep (Density 25 · Complex 8)</div>
    `;
  }

  function renderTeamSection(team) {
    if (!team.reps.length) return "";

    const repRows = team.reps
      .map(
        (r) => `<div class="agent-row">
          <div class="agent-meta">
            <span class="agent-name">${r.name}</span>
            <span class="agent-nums">
              <strong>${fmt.format(r.actual)}</strong> / ${fmt.format(r.target)}
              <span class="agent-pct ${progressClass(r.progressPct)}">${r.progressPct}%</span>
            </span>
          </div>
          ${renderProgressBar(r.actual, r.target, r.progressPct)}
        </div>`,
      )
      .join("");

    return `<section class="team-card team-${team.team}">
      <header class="team-head">
        <div>
          <h3>${team.label}</h3>
          <span class="team-target-hint">Țintă per rep: ${fmt.format(team.targetPerRep)}</span>
        </div>
        <div class="team-totals">
          <span class="team-actual">${fmt.format(team.actual)}</span>
          <span class="team-sep">/</span>
          <span class="team-target">${fmt.format(team.target)}</span>
          <span class="team-pct ${progressClass(team.progressPct)}">${team.progressPct}%</span>
        </div>
      </header>
      ${renderProgressBar(team.actual, team.target, team.progressPct)}
      <div class="agent-list">${repRows}</div>
    </section>`;
  }

  function renderActivations(kpi) {
    renderActivationsTotal(kpi);
    const teams = [kpi.teams.density, kpi.teams.complex].filter((t) => t.reps.length > 0);
    els.activationsTeams.innerHTML = teams.map(renderTeamSection).join("");
  }

  function renderKpis(overview) {
    els.kpiGrid.innerHTML = KPI_DEFS.map((k) => {
      const cls = [
        "kpi-card",
        k.accent ? "accent" : "",
        k.success ? "success" : "",
        k.danger ? "danger" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<article class="${cls}">
        <div class="label">${k.label}</div>
        <div class="value">${fmt.format(overview[k.key] ?? 0)}</div>
        <div class="hint">${k.hint}</div>
      </article>`;
    }).join("");
  }

  function stageBarClass(stage) {
    const s = stage.toLowerCase();
    if (s.includes("lost") || s.includes("not working")) return "lost";
    if (s.includes("won") || s.includes("activated")) return "";
    return "neutral";
  }

  function renderStages(stages) {
    const top = [...stages]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const max = Math.max(...top.map((s) => s.count), 1);
    els.stageChart.innerHTML = top
      .map(
        (s) => `<div class="bar-row">
          <span class="bar-label" title="${s.stage}">${s.stage}</span>
          <div class="bar-track"><div class="bar-fill ${stageBarClass(s.stage)}" style="width:${(s.count / max) * 100}%"></div></div>
          <span class="bar-count">${fmt.format(s.count)}</span>
        </div>`,
      )
      .join("");
  }

  function renderTrend(points) {
    const data = points.slice(-14);
    const max = Math.max(
      ...data.flatMap((d) => [d.closedWon, d.closedLost, d.newOpportunities]),
      1,
    );
    els.trendChart.innerHTML = data
      .map((d) => {
        const wonH = (d.closedWon / max) * 100;
        const lostH = (d.closedLost / max) * 100;
        const label = d.date.slice(5);
        return `<div class="trend-col">
          <div class="trend-bar-group">
            <div class="trend-bar won" style="height:${wonH}%" title="Won: ${d.closedWon}"></div>
            <div class="trend-bar lost" style="height:${lostH}%" title="Lost: ${d.closedLost}"></div>
          </div>
          <span class="trend-date">${label}</span>
        </div>`;
      })
      .join("");
  }

  function renderReps(reps) {
    els.repTableBody.innerHTML = reps
      .map((r) => {
        const rateCls = r.winRate >= 0.5 ? "rate-good" : "rate-low";
        return `<tr>
          <td><strong>${r.name}</strong><br><span style="color:var(--muted);font-size:12px">${r.email}</span></td>
          <td class="num">${fmt.format(r.opportunitiesMonth)}</td>
          <td class="num">${fmt.format(r.closedWon)}</td>
          <td class="num">${fmt.format(r.closedLost)}</td>
          <td class="num">${fmt.format(r.activated)}</td>
          <td class="num ${rateCls}">${pct.format(r.winRate)}</td>
        </tr>`;
      })
      .join("");
  }

  function formatSyncedAt(iso) {
    try {
      return new Date(iso).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  async function loadDashboard() {
    showLoading(true);
    try {
      const meRes = await fetch("/api/me", { credentials: "same-origin" });
      if (!meRes.ok) {
        window.location.href = "/login.html";
        return;
      }
      const me = await meRes.json();
      const roleLabel = me.role === "leader" ? "Team Leader" : "Agent";
      els.userChip.textContent = `${me.name} · ${roleLabel}`;

      const dataRes = await fetch("/api/data", { credentials: "same-origin" });
      if (!dataRes.ok) throw new Error("Failed to load data");
      const data = await dataRes.json();

      els.periodLabel.textContent = data.meta.periodLabel;
      els.syncMeta.textContent = `Sync: ${formatSyncedAt(data.meta.syncedAt)} · ${data.meta.sources.join(" + ")}`;

      if (data.activationsKpi) renderActivations(data.activationsKpi);
      renderKpis(data.overview);
      renderStages(data.stageBreakdown);
      renderTrend(data.dailyTrend);
      renderReps(data.repMetrics);
    } catch (err) {
      console.error(err);
      els.periodLabel.textContent = "Eroare la încărcarea datelor.";
    } finally {
      showLoading(false);
    }
  }

  els.logoutBtn.addEventListener("click", async () => {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    window.location.href = "/login.html";
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.classList.contains("disabled")) return;
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isOverview = tab.dataset.tab === "overview";
      document.getElementById("tab-overview").style.display = isOverview ? "" : "none";
      document.getElementById("tab-placeholder").classList.toggle("visible", !isOverview);
    });
  });

  loadDashboard();
})();
