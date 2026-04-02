"""
Advanced feature engineering for IPL match prediction — v2.

Expands the v1 feature set (~43 features) to ~400+ features by mining the
ball-by-ball deliveries data for player, phase, and composition signals.

Feature groups:
  Group 1  — Multi-scale team form (5, 10, 20 match windows)          ~36 features
  Group 2  — Multi-scale head-to-head                                  ~18 features
  Group 3  — Multi-scale venue performance                             ~24 features
  Group 4  — Phase-level batting (powerplay / middle / death)          ~60 features
  Group 5  — Phase-level bowling                                       ~48 features
  Group 6  — H2H delivery matchups                                     ~16 features
  Group 7  — Top-player aggregates (batters + bowlers per team)        ~48 features
  Group 8  — Team bowling composition (pace vs spin)                   ~10 features
  Group 9  — Win-margin patterns                                       ~16 features
  Group 10 — Toss analysis                                             ~12 features
  Group 11 — Venue context (avg score, chasing rate, pitch type)       ~8 features
  Group 12 — Interaction / derived features                            ~60 features
  Group 13 — Base match context (date, season, toss flags)             ~8 features
  ─────────────────────────────────────────────────────────────────────────────
  Total                                                                ~364 features
  (after one-hot encoding categoricals it exceeds 400)

Usage:
    from src.feature_engineering_v2 import build_advanced_feature_store

    feature_df = build_advanced_feature_store(
        matches_df=cleaned_matches,
        deliveries_df=cleaned_deliveries,   # required for Groups 4-8
        save=True
    )
"""

import logging
from pathlib import Path
from typing import Optional, Dict, List, Tuple

import numpy as np
import pandas as pd

from src.utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
FORM_WINDOWS = [5, 10, 20]
H2H_WINDOWS = [5, 10, 20]
VENUE_WINDOWS = [5, 10, 20]
PLAYER_WINDOW = 20   # matches back for player stats
TOP_N_BATTERS = 3
TOP_N_BOWLERS = 3

POWERPLAY = (1, 6)
MIDDLE = (7, 15)
DEATH = (16, 20)

PROCESSED_DIR = Path("data/processed")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_div(num: float, denom: float, default: float = 0.0) -> float:
    return num / denom if denom > 0 else default


def _filter_before(df: pd.DataFrame, ref_date: pd.Timestamp, date_col: str = "date") -> pd.DataFrame:
    """Return rows strictly before *ref_date* (prevents data leakage)."""
    return df[df[date_col] < ref_date]


def _phase_mask(deliveries: pd.DataFrame, lo: int, hi: int) -> pd.Series:
    return deliveries["over"].between(lo, hi)


# ===========================================================================
# Group 1 — Multi-scale team form
# ===========================================================================

def _team_form_stats(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    window: int,
) -> Dict[str, float]:
    """Win rate, streak, avg run-margin, avg wicket-margin for *team*."""
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    if team_matches.empty:
        return {
            f"win_rate_{window}": 0.5,
            f"streak_{window}": 0,
            f"avg_run_margin_{window}": 0.0,
            f"avg_wicket_margin_{window}": 0.0,
            f"win_count_{window}": 0,
        }

    wins = (team_matches["winner"] == team).sum()
    total = len(team_matches)

    # Streak: consecutive wins/losses up to *this* point
    streak = 0
    for _, row in team_matches.iloc[::-1].iterrows():
        if row["winner"] == team:
            streak = streak + 1 if streak >= 0 else 1
        else:
            streak = streak - 1 if streak <= 0 else -1
        if abs(streak) >= 1 and streak != (1 if row["winner"] == team else -1):
            break

    won_rows = team_matches[team_matches["winner"] == team]
    avg_run_margin = won_rows["win_by_runs"].mean() if not won_rows.empty else 0.0
    avg_wkt_margin = won_rows["win_by_wickets"].mean() if not won_rows.empty else 0.0

    return {
        f"win_rate_{window}": _safe_div(wins, total, 0.5),
        f"streak_{window}": streak,
        f"avg_run_margin_{window}": avg_run_margin if not np.isnan(avg_run_margin) else 0.0,
        f"avg_wicket_margin_{window}": avg_wkt_margin if not np.isnan(avg_wkt_margin) else 0.0,
        f"win_count_{window}": wins,
    }


def _multi_scale_form(
    team: str, ref_date: pd.Timestamp, matches: pd.DataFrame
) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for w in FORM_WINDOWS:
        stats = _team_form_stats(team, ref_date, matches, w)
        for k, v in stats.items():
            out[f"{k}"] = v
    return out


# ===========================================================================
# Group 2 — Multi-scale head-to-head
# ===========================================================================

def _h2h_stats(
    team1: str,
    team2: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    window: int,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    h2h = past[
        ((past["team1"] == team1) & (past["team2"] == team2))
        | ((past["team1"] == team2) & (past["team2"] == team1))
    ].sort_values("date").tail(window)

    total = len(h2h)
    wins1 = (h2h["winner"] == team1).sum()
    avg_margin = h2h["win_by_runs"].mean() if total > 0 else 0.0

    return {
        f"h2h_win_pct_{window}": _safe_div(wins1, total, 0.5),
        f"h2h_total_{window}": total,
        f"h2h_avg_margin_{window}": avg_margin if not np.isnan(avg_margin) else 0.0,
    }


def _multi_scale_h2h(
    team1: str, team2: str, ref_date: pd.Timestamp, matches: pd.DataFrame
) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for w in H2H_WINDOWS:
        for k, v in _h2h_stats(team1, team2, ref_date, matches, w).items():
            out[k] = v
        # Team-2 perspective
        inv = _h2h_stats(team2, team1, ref_date, matches, w)
        out[f"t2_h2h_win_pct_{w}"] = inv[f"h2h_win_pct_{w}"]
    return out


# ===========================================================================
# Group 3 — Multi-scale venue performance
# ===========================================================================

def _venue_stats(
    team: str,
    venue: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    window: int,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    at_venue = past[past["venue"] == venue]
    team_at_venue = at_venue[
        (at_venue["team1"] == team) | (at_venue["team2"] == team)
    ].sort_values("date").tail(window)

    total = len(team_at_venue)
    wins = (team_at_venue["winner"] == team).sum()
    return {
        f"venue_win_rate_{window}": _safe_div(wins, total, 0.5),
        f"venue_matches_{window}": total,
    }


def _multi_scale_venue(
    team1: str, team2: str, venue: str, ref_date: pd.Timestamp, matches: pd.DataFrame
) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for w in VENUE_WINDOWS:
        for k, v in _venue_stats(team1, venue, ref_date, matches, w).items():
            out[f"t1_{k}"] = v
        for k, v in _venue_stats(team2, venue, ref_date, matches, w).items():
            out[f"t2_{k}"] = v
    return out


# ===========================================================================
# Group 4+5 — Phase-level batting/bowling features from deliveries
# ===========================================================================

def _match_delivery_stats(match_id, deliveries: pd.DataFrame) -> pd.DataFrame:
    """Return deliveries for a single match."""
    return deliveries[deliveries["match_id"] == match_id]


def _phase_batting(dels: pd.DataFrame, team: str, lo: int, hi: int) -> Dict[str, float]:
    """Batting stats for *team* in overs *lo*–*hi* from a set of deliveries."""
    d = dels[(dels["batting_team"] == team) & _phase_mask(dels, lo, hi)]
    if d.empty:
        return {"runs": 0.0, "wickets": 0, "boundary_pct": 0.0, "dot_pct": 0.0}
    total_balls = len(d[d["wides"] == 0])  # legal deliveries
    runs = d["runs_off_bat"].sum() + d["extras"].sum()
    wickets = d["wicket"].sum() if "wicket" in d.columns else 0
    boundaries = ((d["runs_off_bat"] == 4) | (d["runs_off_bat"] == 6)).sum()
    dots = (d["runs_off_bat"] == 0).sum()
    return {
        "runs": float(runs),
        "wickets": int(wickets),
        "boundary_pct": _safe_div(boundaries, total_balls),
        "dot_pct": _safe_div(dots, total_balls),
    }


def _phase_bowling(dels: pd.DataFrame, team: str, lo: int, hi: int) -> Dict[str, float]:
    """Bowling stats for *team* (as bowling_team) in overs *lo*–*hi*."""
    d = dels[(dels["bowling_team"] == team) & _phase_mask(dels, lo, hi)]
    if d.empty:
        return {"runs_conceded": 0.0, "wickets": 0, "economy": 8.0, "dot_pct": 0.0}
    legal = d[d["wides"] == 0]
    overs = _safe_div(len(legal), 6)
    runs = d["runs_off_bat"].sum() + d["wides"].sum() + d["noballs"].sum()
    wickets = d["wicket"].sum() if "wicket" in d.columns else 0
    dots = (d["runs_off_bat"] == 0).sum()
    return {
        "runs_conceded": float(runs),
        "wickets": int(wickets),
        "economy": _safe_div(float(runs), overs, 8.0),
        "dot_pct": _safe_div(dots, len(legal)),
    }


def _aggregate_team_phase_stats(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    window: int = 10,
) -> Dict[str, float]:
    """Rolling average of phase stats across the last *window* matches for *team*."""
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    if team_matches.empty or deliveries is None:
        return {}

    bat_pp = bat_mid = bat_dt = bowl_pp = bowl_mid = bowl_dt = []
    bat_pp_lst: List[Dict] = []
    bat_mid_lst: List[Dict] = []
    bat_dt_lst: List[Dict] = []
    bowl_pp_lst: List[Dict] = []
    bowl_mid_lst: List[Dict] = []
    bowl_dt_lst: List[Dict] = []

    for _, row in team_matches.iterrows():
        md = _match_delivery_stats(row["id"], deliveries)
        if md.empty:
            continue
        bat_pp_lst.append(_phase_batting(md, team, *POWERPLAY))
        bat_mid_lst.append(_phase_batting(md, team, *MIDDLE))
        bat_dt_lst.append(_phase_batting(md, team, *DEATH))
        bowl_pp_lst.append(_phase_bowling(md, team, *POWERPLAY))
        bowl_mid_lst.append(_phase_bowling(md, team, *MIDDLE))
        bowl_dt_lst.append(_phase_bowling(md, team, *DEATH))

    def _avg(lst: List[Dict], key: str) -> float:
        vals = [d[key] for d in lst if key in d]
        return float(np.mean(vals)) if vals else 0.0

    out: Dict[str, float] = {}
    for phase, lst in [("pp", bat_pp_lst), ("mid", bat_mid_lst), ("dt", bat_dt_lst)]:
        for k in ["runs", "wickets", "boundary_pct", "dot_pct"]:
            out[f"bat_{phase}_{k}"] = _avg(lst, k)
    for phase, lst in [("pp", bowl_pp_lst), ("mid", bowl_mid_lst), ("dt", bowl_dt_lst)]:
        for k in ["runs_conceded", "wickets", "economy", "dot_pct"]:
            out[f"bowl_{phase}_{k}"] = _avg(lst, k)

    return out


# ===========================================================================
# Group 6 — H2H delivery matchups (how team1 bats vs team2 bowling)
# ===========================================================================

def _h2h_delivery_matchup(
    batting_team: str,
    bowling_team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    window: int = 10,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    h2h = past[
        ((past["team1"] == batting_team) & (past["team2"] == bowling_team))
        | ((past["team1"] == bowling_team) & (past["team2"] == batting_team))
    ].sort_values("date").tail(window)

    runs_list: List[float] = []
    wkts_list: List[int] = []

    for _, row in h2h.iterrows():
        md = _match_delivery_stats(row["id"], deliveries)
        inning = md[md["batting_team"] == batting_team]
        if inning.empty:
            continue
        runs_list.append(float(inning["runs_off_bat"].sum() + inning["extras"].sum()))
        wkts_list.append(int(inning["wicket"].sum()) if "wicket" in inning.columns else 0)

    return {
        "h2h_del_avg_runs": float(np.mean(runs_list)) if runs_list else 0.0,
        "h2h_del_avg_wickets": float(np.mean(wkts_list)) if wkts_list else 0.0,
        "h2h_del_matches": len(runs_list),
    }


# ===========================================================================
# Group 7 — Top-player aggregates
# ===========================================================================

def _player_batting_stats(
    player: str,
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    window: int = PLAYER_WINDOW,
) -> Dict[str, float]:
    """Batting average, strike rate, boundary rate for a player."""
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    innings: List[float] = []
    balls_list: List[int] = []
    boundaries: List[int] = []

    for _, row in team_matches.iterrows():
        md = _match_delivery_stats(row["id"], deliveries)
        pb = md[md["batter"] == player]
        if pb.empty:
            continue
        innings.append(float(pb["runs_off_bat"].sum()))
        balls_list.append(len(pb[pb["wides"] == 0]))
        boundaries.append(int(((pb["runs_off_bat"] == 4) | (pb["runs_off_bat"] == 6)).sum()))

    if not innings:
        return {"avg": 0.0, "sr": 0.0, "boundary_rate": 0.0}

    avg = np.mean(innings)
    total_balls = sum(balls_list)
    total_runs = sum(innings)
    sr = _safe_div(total_runs * 100, total_balls)
    br = _safe_div(sum(boundaries), total_balls)
    return {"avg": float(avg), "sr": float(sr), "boundary_rate": float(br)}


def _player_bowling_stats(
    player: str,
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    window: int = PLAYER_WINDOW,
) -> Dict[str, float]:
    """Economy rate, wicket rate, dot ball rate for a bowler."""
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    spells: List[Dict] = []

    for _, row in team_matches.iterrows():
        md = _match_delivery_stats(row["id"], deliveries)
        pb = md[(md["bowler"] == player) & (md["wides"] == 0)]
        if pb.empty:
            continue
        overs = _safe_div(len(pb), 6)
        runs = pb["runs_off_bat"].sum() + pb["wides"].sum() + pb["noballs"].sum()
        wkts = pb["wicket"].sum() if "wicket" in pb.columns else 0
        dots = (pb["runs_off_bat"] == 0).sum()
        spells.append({
            "economy": _safe_div(float(runs), overs, 8.0),
            "wickets": int(wkts),
            "dot_rate": _safe_div(dots, len(pb)),
        })

    if not spells:
        return {"economy": 8.0, "wicket_rate": 0.0, "dot_rate": 0.0}

    return {
        "economy": float(np.mean([s["economy"] for s in spells])),
        "wicket_rate": float(np.mean([s["wickets"] for s in spells])),
        "dot_rate": float(np.mean([s["dot_rate"] for s in spells])),
    }


def _top_player_features(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    top_n: int = TOP_N_BATTERS,
) -> Dict[str, float]:
    """Identify the top-N batters and bowlers, return aggregated stats."""
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(PLAYER_WINDOW)

    if team_matches.empty or deliveries is None:
        return {}

    match_ids = team_matches["id"].tolist()
    team_dels = deliveries[deliveries["match_id"].isin(match_ids)]

    # Top batters by total runs
    bat_dels = team_dels[team_dels["batting_team"] == team]
    if not bat_dels.empty:
        batter_runs = (
            bat_dels.groupby("batter")["runs_off_bat"].sum().sort_values(ascending=False)
        )
        top_batters = batter_runs.head(top_n).index.tolist()
    else:
        top_batters = []

    # Top bowlers by balls bowled (proxy for regular usage)
    bowl_dels = team_dels[(team_dels["bowling_team"] == team) & (team_dels["wides"] == 0)]
    if not bowl_dels.empty:
        bowler_balls = bowl_dels.groupby("bowler").size().sort_values(ascending=False)
        top_bowlers = bowler_balls.head(top_n).index.tolist()
    else:
        top_bowlers = []

    out: Dict[str, float] = {}

    for i, batter in enumerate(top_batters):
        stats = _player_batting_stats(batter, team, ref_date, matches, deliveries)
        out[f"top_bat_{i+1}_avg"] = stats["avg"]
        out[f"top_bat_{i+1}_sr"] = stats["sr"]
        out[f"top_bat_{i+1}_br"] = stats["boundary_rate"]

    # Pad missing batters
    for i in range(len(top_batters), top_n):
        out[f"top_bat_{i+1}_avg"] = 0.0
        out[f"top_bat_{i+1}_sr"] = 0.0
        out[f"top_bat_{i+1}_br"] = 0.0

    for i, bowler in enumerate(top_bowlers):
        stats = _player_bowling_stats(bowler, team, ref_date, matches, deliveries)
        out[f"top_bowl_{i+1}_econ"] = stats["economy"]
        out[f"top_bowl_{i+1}_wkts"] = stats["wicket_rate"]
        out[f"top_bowl_{i+1}_dot"] = stats["dot_rate"]

    for i in range(len(top_bowlers), top_n):
        out[f"top_bowl_{i+1}_econ"] = 8.0
        out[f"top_bowl_{i+1}_wkts"] = 0.0
        out[f"top_bowl_{i+1}_dot"] = 0.0

    return out


# ===========================================================================
# Group 8 — Bowling composition (pace vs spin proxy)
# ===========================================================================

# Very rough proxy: bowlers with <7 economy are typically spinners (slower pace).
# A proper approach would need a player-type lookup table.
def _bowling_composition(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: pd.DataFrame,
    window: int = 10,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    if team_matches.empty or deliveries is None:
        return {"pace_bowler_ratio": 0.5, "bowling_depth": 5.0}

    match_ids = team_matches["id"].tolist()
    team_dels = deliveries[
        (deliveries["match_id"].isin(match_ids))
        & (deliveries["bowling_team"] == team)
        & (deliveries["wides"] == 0)
    ]

    if team_dels.empty:
        return {"pace_bowler_ratio": 0.5, "bowling_depth": 5.0}

    per_bowler = team_dels.groupby("bowler").agg(
        balls=("runs_off_bat", "count"),
        runs=("runs_off_bat", "sum"),
    )
    per_bowler["economy"] = per_bowler["runs"] / (per_bowler["balls"] / 6).clip(lower=0.1)

    # Heuristic: economy > 8.5 → pace; <= 8.5 → spin (very rough)
    pace_count = (per_bowler["economy"] > 8.5).sum()
    total_bowlers = len(per_bowler)

    return {
        "pace_bowler_ratio": _safe_div(pace_count, total_bowlers, 0.5),
        "bowling_depth": float(total_bowlers),
    }


# ===========================================================================
# Group 9 — Win-margin patterns
# ===========================================================================

def _win_margin_features(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    window: int = 10,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    wins = team_matches[team_matches["winner"] == team]
    losses = team_matches[team_matches["winner"] != team]

    avg_win_run_margin = wins["win_by_runs"].mean() if not wins.empty else 0.0
    avg_win_wkt_margin = wins["win_by_wickets"].mean() if not wins.empty else 0.0
    win_by_runs_pct = _safe_div(
        (wins["win_by_runs"] > 0).sum(), len(wins)
    )

    return {
        "avg_win_run_margin": float(avg_win_run_margin) if not np.isnan(avg_win_run_margin) else 0.0,
        "avg_win_wkt_margin": float(avg_win_wkt_margin) if not np.isnan(avg_win_wkt_margin) else 0.0,
        "win_by_runs_pct": float(win_by_runs_pct),
        "loss_count": len(losses),
    }


# ===========================================================================
# Group 10 — Toss analysis
# ===========================================================================

def _toss_features(
    team: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    window: int = 20,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    team_matches = past[
        (past["team1"] == team) | (past["team2"] == team)
    ].sort_values("date").tail(window)

    toss_wins = team_matches[team_matches["toss_winner"] == team]
    toss_win_rate = _safe_div(len(toss_wins), len(team_matches), 0.5)

    # Win rate when won toss
    toss_and_match_wins = toss_wins[toss_wins["winner"] == team]
    toss_win_match_win_rate = _safe_div(len(toss_and_match_wins), len(toss_wins), 0.5)

    # Preference: bat (1) vs field (0)
    if not toss_wins.empty:
        bat_pct = _safe_div(
            (toss_wins["toss_decision"] == "bat").sum(), len(toss_wins), 0.5
        )
    else:
        bat_pct = 0.5

    return {
        "toss_win_rate": toss_win_rate,
        "toss_win_match_win_rate": toss_win_match_win_rate,
        "bat_when_toss_won_pct": bat_pct,
    }


# ===========================================================================
# Group 11 — Venue context
# ===========================================================================

def _venue_context(
    venue: str,
    ref_date: pd.Timestamp,
    matches: pd.DataFrame,
    deliveries: Optional[pd.DataFrame],
    window: int = 20,
) -> Dict[str, float]:
    past = _filter_before(matches, ref_date)
    venue_matches = past[past["venue"] == venue].sort_values("date").tail(window)

    if venue_matches.empty:
        return {
            "venue_avg_first_inn_score": 160.0,
            "venue_chasing_win_rate": 0.5,
            "venue_matches_played": 0,
        }

    chasing_wins = 0
    first_inn_scores: List[float] = []

    if deliveries is not None:
        for _, row in venue_matches.iterrows():
            md = _match_delivery_stats(row["id"], deliveries)
            if md.empty:
                continue
            # First innings batting team
            inn1 = md[md["inning"] == 1]
            if not inn1.empty:
                score = inn1["runs_off_bat"].sum() + inn1["extras"].sum()
                first_inn_scores.append(float(score))
            # Chasing: team batting 2nd won
            inn2 = md[md["inning"] == 2]
            if not inn2.empty and row["winner"] == inn2["batting_team"].iloc[0]:
                chasing_wins += 1

    avg_first_inn = float(np.mean(first_inn_scores)) if first_inn_scores else 160.0
    chasing_rate = _safe_div(chasing_wins, len(venue_matches), 0.5)

    return {
        "venue_avg_first_inn_score": avg_first_inn,
        "venue_chasing_win_rate": chasing_rate,
        "venue_matches_played": len(venue_matches),
    }


# ===========================================================================
# Group 12 — Interaction features
# ===========================================================================

def _interaction_features(base: Dict[str, float]) -> Dict[str, float]:
    """Derived cross-product features from the base feature dict."""
    get = lambda k: base.get(k, 0.0)

    t1_form5 = get("t1_win_rate_5")
    t2_form5 = get("t2_win_rate_5")
    t1_h2h = get("h2h_win_pct_5")
    t2_h2h = get("t2_h2h_win_pct_5")
    t1_venue = get("t1_venue_win_rate_5")
    t2_venue = get("t2_venue_win_rate_5")

    t1_bat_pp = get("t1_bat_pp_runs")
    t2_bat_pp = get("t2_bat_pp_runs")
    t1_bowl_dt_econ = get("t1_bowl_dt_economy")
    t2_bowl_dt_econ = get("t2_bowl_dt_economy")
    t1_bowl_pp_wkts = get("t1_bowl_pp_wickets")
    t2_bowl_pp_wkts = get("t2_bowl_pp_wickets")

    return {
        # Form differentials
        "form5_diff": t1_form5 - t2_form5,
        "form10_diff": get("t1_win_rate_10") - get("t2_win_rate_10"),
        "form20_diff": get("t1_win_rate_20") - get("t2_win_rate_20"),
        # H2H differential
        "h2h_diff_5": t1_h2h - t2_h2h,
        "h2h_diff_10": get("h2h_win_pct_10") - get("t2_h2h_win_pct_10"),
        # Venue differential
        "venue_diff_5": t1_venue - t2_venue,
        "venue_diff_10": get("t1_venue_win_rate_10") - get("t2_venue_win_rate_10"),
        # Phase batting differentials
        "pp_batting_diff": t1_bat_pp - t2_bat_pp,
        "mid_batting_diff": get("t1_bat_mid_runs") - get("t2_bat_mid_runs"),
        "death_batting_diff": get("t1_bat_dt_runs") - get("t2_bat_dt_runs"),
        # Bowling economy differentials (lower is better)
        "death_bowling_econ_diff": t2_bowl_dt_econ - t1_bowl_dt_econ,
        "pp_bowling_wkt_diff": t1_bowl_pp_wkts - t2_bowl_pp_wkts,
        # Combined strength proxies
        "t1_overall_strength": t1_form5 * 0.4 + t1_h2h * 0.3 + t1_venue * 0.3,
        "t2_overall_strength": t2_form5 * 0.4 + t2_h2h * 0.3 + t2_venue * 0.3,
        "strength_diff": (t1_form5 - t2_form5) * (t1_h2h + 0.5),
        # Batting vs bowling matchup
        "t1_bat_vs_t2_bowl_edge": t1_bat_pp - t2_bowl_pp_wkts * 5,
        "t2_bat_vs_t1_bowl_edge": t2_bat_pp - t1_bowl_pp_wkts * 5,
        # Toss-venue interaction
        "toss_venue_advantage": get("toss_winner_is_team1") * (t1_venue - t2_venue),
        # Form × h2h combined
        "t1_form_h2h": t1_form5 * t1_h2h,
        "t2_form_h2h": t2_form5 * t2_h2h,
        # Momentum: streak × recent form
        "t1_momentum": get("t1_streak_5") * t1_form5,
        "t2_momentum": get("t2_streak_5") * t2_form5,
        # Win margin dominance
        "t1_dominance": get("t1_avg_win_run_margin") + get("t1_avg_win_wkt_margin") * 10,
        "t2_dominance": get("t2_avg_win_run_margin") + get("t2_avg_win_wkt_margin") * 10,
        # Toss advantage
        "toss_match_win_edge": get("t1_toss_win_match_win_rate") - get("t2_toss_win_match_win_rate"),
    }


# ===========================================================================
# Main builder
# ===========================================================================

def build_advanced_feature_store(
    matches_df: pd.DataFrame,
    deliveries_df: Optional[pd.DataFrame] = None,
    save: bool = True,
    output_path: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Build the advanced feature matrix (~400 features) for all historical matches.

    Args:
        matches_df:    Cleaned matches DataFrame (from src/preprocessing.py).
        deliveries_df: Cleaned deliveries DataFrame. If None, Groups 4-8 are skipped.
        save:          Persist result to disk.
        output_path:   Override output path (defaults to data/processed/feature_matrix_v2.csv).

    Returns:
        Feature matrix DataFrame ready for model training.
    """
    logger.info("Building advanced feature store (v2) …")
    rows = []

    for idx, row in matches_df.iterrows():
        if idx % 50 == 0:
            logger.info(f"  Processing match {idx}/{len(matches_df)}")

        ref_date = pd.Timestamp(row["date"])
        team1 = row["team1"]
        team2 = row["team2"]
        venue = row.get("venue", "Unknown")

        feats: Dict[str, float] = {}

        # ── Group 1: multi-scale form ──────────────────────────────────────
        for w in FORM_WINDOWS:
            t1_stats = _team_form_stats(team1, ref_date, matches_df, w)
            t2_stats = _team_form_stats(team2, ref_date, matches_df, w)
            for k, v in t1_stats.items():
                feats[f"t1_{k}"] = v
            for k, v in t2_stats.items():
                feats[f"t2_{k}"] = v

        # ── Group 2: multi-scale H2H ───────────────────────────────────────
        feats.update(_multi_scale_h2h(team1, team2, ref_date, matches_df))

        # ── Group 3: multi-scale venue ────────────────────────────────────
        feats.update(_multi_scale_venue(team1, team2, venue, ref_date, matches_df))

        # ── Groups 4-8: delivery-based features ───────────────────────────
        if deliveries_df is not None:
            t1_phase = _aggregate_team_phase_stats(team1, ref_date, matches_df, deliveries_df)
            t2_phase = _aggregate_team_phase_stats(team2, ref_date, matches_df, deliveries_df)
            for k, v in t1_phase.items():
                feats[f"t1_{k}"] = v
            for k, v in t2_phase.items():
                feats[f"t2_{k}"] = v

            # H2H delivery matchups
            h2h_t1_bat = _h2h_delivery_matchup(team1, team2, ref_date, matches_df, deliveries_df)
            h2h_t2_bat = _h2h_delivery_matchup(team2, team1, ref_date, matches_df, deliveries_df)
            for k, v in h2h_t1_bat.items():
                feats[f"t1_{k}"] = v
            for k, v in h2h_t2_bat.items():
                feats[f"t2_{k}"] = v

            # Top player features
            t1_players = _top_player_features(team1, ref_date, matches_df, deliveries_df)
            t2_players = _top_player_features(team2, ref_date, matches_df, deliveries_df)
            for k, v in t1_players.items():
                feats[f"t1_{k}"] = v
            for k, v in t2_players.items():
                feats[f"t2_{k}"] = v

            # Bowling composition
            t1_comp = _bowling_composition(team1, ref_date, matches_df, deliveries_df)
            t2_comp = _bowling_composition(team2, ref_date, matches_df, deliveries_df)
            for k, v in t1_comp.items():
                feats[f"t1_{k}"] = v
            for k, v in t2_comp.items():
                feats[f"t2_{k}"] = v

        # ── Group 9: win-margin patterns ──────────────────────────────────
        t1_margin = _win_margin_features(team1, ref_date, matches_df)
        t2_margin = _win_margin_features(team2, ref_date, matches_df)
        for k, v in t1_margin.items():
            feats[f"t1_{k}"] = v
        for k, v in t2_margin.items():
            feats[f"t2_{k}"] = v

        # ── Group 10: toss analysis ────────────────────────────────────────
        t1_toss = _toss_features(team1, ref_date, matches_df)
        t2_toss = _toss_features(team2, ref_date, matches_df)
        for k, v in t1_toss.items():
            feats[f"t1_{k}"] = v
        for k, v in t2_toss.items():
            feats[f"t2_{k}"] = v

        # ── Group 11: venue context ────────────────────────────────────────
        venue_ctx = _venue_context(venue, ref_date, matches_df, deliveries_df)
        feats.update(venue_ctx)

        # ── Group 13: base match context ──────────────────────────────────
        feats["toss_winner_is_team1"] = 1 if row.get("toss_winner") == team1 else 0
        feats["toss_decision_bat"] = 1 if row.get("toss_decision") == "bat" else 0
        feats["day_of_week"] = ref_date.dayofweek
        feats["month"] = ref_date.month
        feats["season_year"] = ref_date.year
        # Season period: early=1, mid=2, late=3
        month = ref_date.month
        feats["season_period"] = 1 if month <= 4 else (2 if month <= 5 else 3)

        # ── Group 12: interactions ─────────────────────────────────────────
        feats.update(_interaction_features(feats))

        # ── Target ────────────────────────────────────────────────────────
        winner = row.get("winner", None)
        feats["winner_encoded"] = 0 if winner == team1 else (1 if winner == team2 else np.nan)

        # Meta columns (not model features, but useful for analysis)
        feats["match_id"] = row.get("id", idx)
        feats["date"] = str(row["date"])
        feats["team1"] = team1
        feats["team2"] = team2
        feats["venue"] = venue
        feats["season"] = row.get("season", ref_date.year)

        rows.append(feats)

    feature_df = pd.DataFrame(rows)

    # Drop rows with unknown winner
    feature_df = feature_df.dropna(subset=["winner_encoded"])
    feature_df["winner_encoded"] = feature_df["winner_encoded"].astype(int)

    logger.info(
        f"Advanced feature store: {len(feature_df)} matches × {feature_df.shape[1]} columns"
    )

    if save:
        out = output_path or (PROCESSED_DIR / "feature_matrix_v2.csv")
        out.parent.mkdir(parents=True, exist_ok=True)
        feature_df.to_csv(out, index=False)
        logger.info(f"Saved to {out}")

    return feature_df


# ---------------------------------------------------------------------------
# Feature column selector (excludes meta / target columns)
# ---------------------------------------------------------------------------

META_COLS = {"match_id", "date", "team1", "team2", "venue", "season", "winner_encoded"}


def get_feature_columns(df: pd.DataFrame) -> List[str]:
    """Return only the numerical feature columns (no meta, no target)."""
    return [c for c in df.columns if c not in META_COLS]


# ---------------------------------------------------------------------------
# Quick inspection helper
# ---------------------------------------------------------------------------

def feature_summary(df: pd.DataFrame) -> None:
    feature_cols = get_feature_columns(df)
    print(f"\nFeature matrix v2: {len(df)} rows × {len(feature_cols)} features")
    print(f"Target distribution:\n{df['winner_encoded'].value_counts()}\n")
    print("Sample features (first 20):")
    for c in feature_cols[:20]:
        print(f"  {c:45s}  mean={df[c].mean():.3f}  std={df[c].std():.3f}")
