#!/usr/bin/env python3
"""Generate intelligence-vs-cost and coding-vs-cost plots for opencode-oneprovider README.

Fetches and caches Artificial Analysis benchmark data, matches against the 11 default
OneProvider models defined in scripts/models.yaml, generates two PNG plots, and updates
the README.md benchmark and pricing tables in-place.

Usage:
    python scripts/plot.py            # use cached data
    python scripts/plot.py --refresh  # re-fetch from AA API first
    python scripts/plot.py --offline  # never hit network (fail if no cache)
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore", category=UserWarning, module="matplotlib")

import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import requests
import yaml
from adjustText import adjust_text

# ---------------------------------------------------------------------------
# Paths (all relative to repo root)
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
CACHE_FILE = SCRIPTS_DIR / "data" / "aa_models.json"
MODELS_YAML = SCRIPTS_DIR / "models.yaml"
PLOTS_DIR = SCRIPTS_DIR / "plots"
README_PATH = REPO_ROOT / "README.md"

AA_API_URL = "https://artificialanalysis.ai/api/v2/language/models/free"

# README sentinel comments
SENTINEL_BENCHMARK_BEGIN = "<!-- BEGIN BENCHMARK TABLE -->"
SENTINEL_BENCHMARK_END = "<!-- END BENCHMARK TABLE -->"
SENTINEL_PRICING_BEGIN = "<!-- BEGIN PRICING TABLE -->"
SENTINEL_PRICING_END = "<!-- END PRICING TABLE -->"

# OneProvider pricing table data (kept in sync with src/models.ts)
PRICING = {
    "claude-fable-5-1":  {"name": "Claude Fable 5.1",   "ctx": 1_048_576, "out": 65_536,  "in": 10.00, "out_p": 50.00,  "cr": 0.25,  "cw": 12.50},
    "claude-opus-5-5":   {"name": "Claude Opus 5.5",     "ctx": 1_000_000, "out": 128_000, "in":  4.00, "out_p": 20.00,  "cr": 0.20,  "cw":  5.00},
    "claude-sonnet-5-5": {"name": "Claude Sonnet 5.5",   "ctx": 1_000_000, "out": 65_536,  "in":  1.00, "out_p":  5.00,  "cr": 0.10,  "cw":  1.25},
    "claude-haiku-4-5":  {"name": "Claude Haiku 4.5",    "ctx": 204_800,   "out": 8_192,   "in":  1.00, "out_p":  5.00,  "cr": 0.10,  "cw":  1.25},
    "deepseek-v4-pro":   {"name": "DeepSeek V4 Pro",     "ctx": 1_048_576, "out": 8_192,   "in":  0.66, "out_p":  1.98,  "cr": 0.022, "cw":  0.66},
    "deepseek-v4-flash": {"name": "DeepSeek V4 Flash",   "ctx": 1_048_576, "out": 8_192,   "in":  0.22, "out_p":  0.66,  "cr": 0.007, "cw":  0.22},
    "glm-5.3":           {"name": "GLM 5.3",             "ctx": 1_048_576, "out": 131_072, "in":  1.40, "out_p":  4.40,  "cr": 0.26,  "cw":  1.40},
    "glm-5.3-flash":     {"name": "GLM 5.3 Flash",       "ctx": 1_048_576, "out": 131_072, "in":  0.15, "out_p":  0.50,  "cr": 0.03,  "cw":  0.15},
    "gpt-6-luna":        {"name": "GPT-6 Luna",          "ctx": 1_048_576, "out": 128_000, "in":  0.10, "out_p":  0.50,  "cr": 0.01,  "cw":  0.125},
    "gpt-6.1-sol":       {"name": "GPT-6.1 Sol",         "ctx": 1_048_576, "out": 128_000, "in":  2.00, "out_p": 10.00,  "cr": 0.10,  "cw":  2.00},
    "gpt-5.6-terra":     {"name": "GPT-5.6 Terra",       "ctx": 1_048_576, "out": 128_000, "in":  2.50, "out_p": 15.00,  "cr": 0.25,  "cw":  3.125},
}


# ---------------------------------------------------------------------------
# Env / API key
# ---------------------------------------------------------------------------

def load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.is_file():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip("'\"")
            if k and k not in os.environ:
                os.environ[k] = v


def get_api_key() -> str | None:
    load_env()
    return os.environ.get("AA_API_KEY")


# ---------------------------------------------------------------------------
# Cache / fetch
# ---------------------------------------------------------------------------

def fetch_models() -> dict[str, Any]:
    api_key = get_api_key()
    if not api_key:
        print("ERROR: AA_API_KEY not set. Add it to .env or export it.", file=sys.stderr)
        sys.exit(1)

    headers = {
        "x-api-key": api_key,
        "AA-API-Key": api_key,
        "Accept": "application/json",
        "User-Agent": "opencode-oneprovider/1.0",
    }

    all_models: list[dict] = []
    page = 1
    intelligence_index_version: str | None = None

    print("Fetching model data from Artificial Analysis API...")
    while True:
        url = f"{AA_API_URL}?page={page}"
        try:
            resp = requests.get(url, headers=headers, timeout=30)
        except requests.RequestException as e:
            print(f"ERROR: Network request failed: {e}", file=sys.stderr)
            sys.exit(1)

        if resp.status_code in (401, 403):
            print(f"ERROR: HTTP {resp.status_code} — check your AA_API_KEY.", file=sys.stderr)
            sys.exit(1)
        if not resp.ok:
            print(f"ERROR: HTTP {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
            sys.exit(1)

        data = resp.json()
        if isinstance(data, list):
            models_page = data
            has_more = False
        elif isinstance(data, dict):
            models_page = data.get("data") or data.get("models") or []
            pagination = data.get("pagination", {})
            has_more = pagination.get("has_more", False)
            if not intelligence_index_version:
                intelligence_index_version = (
                    data.get("intelligence_index_version")
                    or data.get("metadata", {}).get("intelligence_index_version")
                )
        else:
            print("ERROR: Unexpected API response format.", file=sys.stderr)
            sys.exit(1)

        all_models.extend(models_page)
        print(f"  Page {page}: {len(models_page)} models (total: {len(all_models)})")
        if not has_more or not models_page:
            break
        page += 1

    result = {
        "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "intelligence_index_version": intelligence_index_version,
        "models": all_models,
    }
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = CACHE_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    tmp.replace(CACHE_FILE)
    print(f"Cached {len(all_models)} models → {CACHE_FILE}")
    return result


def load_cache() -> dict[str, Any] | None:
    if not CACHE_FILE.is_file():
        return None
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"WARNING: Failed to read cache: {e}", file=sys.stderr)
        return None


def ensure_data(refresh: bool, offline: bool) -> dict[str, Any]:
    if refresh:
        if offline:
            print("ERROR: --refresh conflicts with --offline.", file=sys.stderr)
            sys.exit(1)
        return fetch_models()
    cached = load_cache()
    if cached is None:
        if offline:
            print(f"ERROR: No cache at {CACHE_FILE} and --offline specified.", file=sys.stderr)
            sys.exit(1)
        return fetch_models()
    return cached


# ---------------------------------------------------------------------------
# Models YAML
# ---------------------------------------------------------------------------

def load_models_yaml() -> list[dict]:
    with open(MODELS_YAML, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("models", [])


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------

def extract_cost(record: dict) -> float | None:
    cost_obj = record.get("artificial_analysis_intelligence_index_cost")
    if isinstance(cost_obj, dict):
        cpt = cost_obj.get("cost_per_task")
        if isinstance(cpt, dict):
            val = cpt.get("total_cost")
            if isinstance(val, (int, float)):
                return float(val)
    return None


def extract_intelligence(record: dict) -> float | None:
    evals = record.get("evaluations") or {}
    val = evals.get("artificial_analysis_intelligence_index")
    return float(val) if isinstance(val, (int, float)) else None


def extract_coding(record: dict) -> float | None:
    evals = record.get("evaluations") or {}
    val = evals.get("artificial_analysis_coding_index")
    return float(val) if isinstance(val, (int, float)) else None


# ---------------------------------------------------------------------------
# Build per-model variant data
# ---------------------------------------------------------------------------

def build_model_data(models_cfg: list[dict], name_map: dict[str, dict]) -> list[dict]:
    """
    Returns a list of model entries, each with resolved variant data.
    Each entry: {id, label, color, variants: [{effort, intel, coding, cost}]}
    Variants with no data at all (not in name_map) are skipped with a warning.
    """
    results = []
    for mcfg in models_cfg:
        mid = mcfg["id"]
        label = mcfg["label"]
        color = mcfg["color"]
        variant_cfgs = mcfg.get("variants") or []

        resolved = []
        for vcfg in variant_cfgs:
            aa_name = vcfg["aa_name"]
            effort = vcfg["effort"]
            if aa_name not in name_map:
                print(f"  WARNING: '{aa_name}' not in AA dataset — skipping (will appear after --refresh)")
                continue
            rec = name_map[aa_name]
            intel = extract_intelligence(rec)
            coding = extract_coding(rec)
            cost = extract_cost(rec)
            resolved.append({
                "effort": effort,
                "intel": intel,
                "coding": coding,
                "cost": cost,
            })

        results.append({
            "id": mid,
            "label": label,
            "color": color,
            "variants": resolved,
        })
    return results


# ---------------------------------------------------------------------------
# Pareto frontier
# ---------------------------------------------------------------------------

def compute_pareto(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Pareto frontier: maximize Y for minimum X (cost). Returns sorted list."""
    if not points:
        return []
    sorted_pts = sorted(points, key=lambda p: (p[0], -p[1]))
    frontier: list[tuple[float, float]] = []
    max_y = -float("inf")
    for x, y in sorted_pts:
        if y > max_y:
            frontier.append((x, y))
            max_y = y
    return frontier


# ---------------------------------------------------------------------------
# Dollar formatter
# ---------------------------------------------------------------------------

def dollar_fmt(x: float, _pos: Any = None) -> str:
    if x >= 1:
        return f"${x:.2f}"
    if x >= 0.01:
        return f"${x:.2f}"
    if x >= 0.001:
        return f"${x:.3f}"
    return f"${x:.4f}"


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------

def generate_plot(
    model_data: list[dict],
    metric: str,
    cache_meta: dict,
    output_path: Path,
) -> None:
    """Generate one scatter + line plot for the given metric ('intel' or 'coding')."""
    assert metric in ("intel", "coding")
    metric_title = (
        "Artificial Analysis Intelligence Index"
        if metric == "intel"
        else "Artificial Analysis Coding Index"
    )
    plot_title = f"{metric_title} vs. Cost per Task"
    subtitle = "X: cost per AA Intelligence Index task   Y: " + (
        "Intelligence Index" if metric == "intel" else "Coding Index"
    )

    fig, ax = plt.subplots(figsize=(13, 8.5), dpi=300)
    fig.patch.set_facecolor("#fafafa")
    ax.set_facecolor("#ffffff")

    all_plot_points: list[tuple[float, float]] = []  # (cost, score) for pareto
    texts = []

    for entry in model_data:
        label = entry["label"]
        color = entry["color"]
        variants = entry["variants"]

        # Only plot variants that have both cost and the metric score
        plottable = [
            v for v in variants
            if v["cost"] is not None and v[metric] is not None
        ]
        if not plottable:
            continue

        xs = [v["cost"] for v in plottable]
        ys = [v[metric] for v in plottable]
        effort_labels = [v["effort"] for v in plottable]

        # Connecting line
        if len(plottable) > 1:
            ax.plot(xs, ys, color=color, linewidth=1.5, alpha=0.7, zorder=3)

        # Scatter dots
        ax.scatter(xs, ys, color=color, s=60, edgecolors="white", linewidths=0.8,
                   zorder=4, label=label)

        # Label the highest-effort point with the family name
        # and each individual dot with its effort label
        for i, (x, y, eff) in enumerate(zip(xs, ys, effort_labels)):
            # Show family name only on the rightmost (highest cost) point
            if i == len(plottable) - 1:
                lbl = f" {label} ({eff})"
            else:
                lbl = f" {eff}"
            t = ax.text(x, y, lbl, fontsize=8, alpha=0.88, weight="medium",
                        color="#222222", zorder=5)
            texts.append(t)

        all_plot_points.extend(zip(xs, ys))

    # Pareto frontier
    pareto = compute_pareto(all_plot_points)
    if len(pareto) > 1:
        px, py = zip(*pareto)
        ax.plot(px, py, color="#555555", linestyle="--", linewidth=1.6,
                alpha=0.8, zorder=2, label="Pareto frontier")

    # Axes
    ax.set_xscale("log")
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(dollar_fmt))
    ax.xaxis.set_minor_formatter(ticker.NullFormatter())
    ax.set_xlabel("Cost per Intelligence Index Task", fontsize=11,
                  fontweight="medium", labelpad=8)
    ax.set_ylabel(metric_title, fontsize=11, fontweight="medium", labelpad=8)

    ax.grid(True, which="major", linestyle="--", linewidth=0.6, alpha=0.5, color="#cccccc")
    ax.grid(True, which="minor", linestyle=":", linewidth=0.4, alpha=0.35, color="#e0e0e0")

    fig.suptitle(plot_title, fontsize=14, fontweight="bold", y=0.96)
    ax.set_title(subtitle, fontsize=9.5, color="#555555", pad=10)

    # Adjust text
    try:
        adjust_text(
            texts,
            ax=ax,
            arrowprops=dict(arrowstyle="-", color="#888888", lw=0.6, alpha=0.7, shrinkA=5),
            expand=(1.2, 1.2),
        )
    except Exception as e:
        print(f"  Note: adjustText: {e}", file=sys.stderr)

    # Attribution
    fetched_at = cache_meta.get("fetched_at", "")
    fetch_date = fetched_at[:10] if fetched_at else datetime.date.today().isoformat()
    version = cache_meta.get("intelligence_index_version")
    v_part = f" · Intelligence Index v{version}" if version else ""
    attribution = f"Source: Artificial Analysis API{v_part} · Data fetched {fetch_date}"
    fig.text(0.98, 0.015, attribution, ha="right", va="bottom",
             fontsize=8, color="#777777", fontstyle="italic")

    # Legend
    legend = ax.legend(loc="upper left", frameon=True, framealpha=0.92,
                       facecolor="#ffffff", edgecolor="#dddddd", fontsize=9)
    legend.set_zorder(10)

    plt.tight_layout(rect=(0.02, 0.03, 0.98, 0.94))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved: {output_path}")


# ---------------------------------------------------------------------------
# Markdown table generation
# ---------------------------------------------------------------------------

def fmt_num(val: float | None, decimals: int = 1) -> str:
    if val is None:
        return "—"
    return f"{val:.{decimals}f}"


def fmt_cost(val: float | None) -> str:
    if val is None:
        return "—"
    if val >= 10:
        return f"${val:.2f}"
    if val >= 1:
        return f"${val:.2f}"
    if val >= 0.1:
        return f"${val:.3f}"
    return f"${val:.4f}"


def fmt_price(val: float) -> str:
    """Format a $/1M price — always show at least 2 decimal places."""
    # Use up to 3 decimal places, but never fewer than 2
    if val == round(val, 2):
        return f"${val:.2f}"
    s = f"{val:.3f}".rstrip("0")
    return f"${s}"


def fmt_ctx(n: int) -> str:
    if n >= 1_000_000:
        return f"{n // 1_000_000}M"
    if n >= 1_000:
        return f"{n // 1_000}K"
    return str(n)


def generate_benchmark_table(model_data: list[dict], models_cfg: list[dict]) -> str:
    """Build the benchmark markdown table."""
    header = (
        "| Model | Effort | Intelligence | Coding | Cost/Task | Intel/Cost |\n"
        "|---|---|---|---|---|---|"
    )
    rows = [header]

    # Preserve order from models_cfg (same as PRICING dict order)
    id_to_entry = {e["id"]: e for e in model_data}

    for mcfg in models_cfg:
        mid = mcfg["id"]
        entry = id_to_entry.get(mid)
        if not entry:
            continue

        variants = entry["variants"]
        if not variants:
            continue  # no AA data at all — omit from benchmark table

        # Filter to variants that have at least an intelligence score
        scored = [v for v in variants if v["intel"] is not None]
        if not scored:
            continue

        name = PRICING[mid]["name"]

        efforts = "<br>".join(v["effort"] for v in scored)
        intels = "<br>".join(fmt_num(v["intel"]) for v in scored)
        codings = "<br>".join(fmt_num(v["coding"]) for v in scored)
        costs = "<br>".join(fmt_cost(v["cost"]) for v in scored)
        ic_vals = []
        for v in scored:
            if v["intel"] is not None and v["cost"] is not None and v["cost"] > 0:
                ic_vals.append(str(round(v["intel"] / v["cost"])))
            else:
                ic_vals.append("—")
        intel_costs = "<br>".join(ic_vals)

        rows.append(f"| {name} | {efforts} | {intels} | {codings} | {costs} | {intel_costs} |")

    return "\n".join(rows)


def generate_pricing_table(models_cfg: list[dict]) -> str:
    """Build the pricing markdown table."""
    header = (
        "| Model ID | Name | Context | Output | In $/1M | Out $/1M | Cache Read | Cache Write |\n"
        "|---|---|---|---|---|---|---|---|"
    )
    rows = [header]

    for mcfg in models_cfg:
        mid = mcfg["id"]
        p = PRICING.get(mid)
        if not p:
            continue
        model_id = f"`oneprovider/{mid}`"
        ctx = fmt_ctx(p["ctx"])
        out = fmt_ctx(p["out"])
        rows.append(
            f"| {model_id} | {p['name']} | {ctx} | {out} | "
            f"{fmt_price(p['in'])} | {fmt_price(p['out_p'])} | "
            f"{fmt_price(p['cr'])} | {fmt_price(p['cw'])} |"
        )

    return "\n".join(rows)


# ---------------------------------------------------------------------------
# README update
# ---------------------------------------------------------------------------

def update_readme(benchmark_table: str, pricing_table: str) -> None:
    with open(README_PATH, encoding="utf-8") as f:
        content = f.read()

    def replace_sentinel(text: str, begin: str, end: str, replacement: str) -> str:
        pattern = re.compile(
            re.escape(begin) + r".*?" + re.escape(end),
            re.DOTALL,
        )
        new_block = f"{begin}\n{replacement}\n{end}"
        if pattern.search(text):
            return pattern.sub(new_block, text)
        print(f"  WARNING: sentinel '{begin}' not found in README — skipping replacement")
        return text

    content = replace_sentinel(
        content,
        SENTINEL_BENCHMARK_BEGIN,
        SENTINEL_BENCHMARK_END,
        benchmark_table,
    )
    content = replace_sentinel(
        content,
        SENTINEL_PRICING_BEGIN,
        SENTINEL_PRICING_END,
        pricing_table,
    )

    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Updated: {README_PATH}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true",
                        help="Re-fetch data from Artificial Analysis API")
    parser.add_argument("--offline", action="store_true",
                        help="Use local cache only; do not access network")
    args = parser.parse_args()

    # 1. Load data
    cache = ensure_data(args.refresh, args.offline)
    models_data = cache.get("models", [])
    name_map: dict[str, dict] = {
        m["name"]: m for m in models_data if isinstance(m, dict) and "name" in m
    }
    print(f"Loaded {len(models_data)} models from cache ({CACHE_FILE.name})")

    # 2. Load models.yaml
    models_cfg = load_models_yaml()
    print(f"Loaded {len(models_cfg)} model entries from {MODELS_YAML.name}")

    # 3. Resolve variant data
    print("\nResolving AA data for configured models...")
    model_data = build_model_data(models_cfg, name_map)

    # 4. Generate plots
    print("\nGenerating plots...")
    generate_plot(model_data, "intel", cache, PLOTS_DIR / "intelligence.png")
    generate_plot(model_data, "coding", cache, PLOTS_DIR / "coding.png")

    # 5. Generate tables
    print("\nGenerating README tables...")
    benchmark_table = generate_benchmark_table(model_data, models_cfg)
    pricing_table = generate_pricing_table(models_cfg)

    # 6. Update README
    update_readme(benchmark_table, pricing_table)

    print("\nDone.")


if __name__ == "__main__":
    main()
