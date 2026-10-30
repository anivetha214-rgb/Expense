"""
FarmPrice AI — Flask + scikit-learn price prediction micro-service
==================================================================
Reads the shared price database (SQLite) directly, trains a
HistGradientBoostingRegressor per crop (features: market, seasonality,
lag-1 / lag-7 / lag-30 statistics) and serves recursive multi-day
forecasts over HTTP.

Endpoints
---------
GET /health                 -> { ready, model, rows, accuracy: {crop: %} }
GET /predict?cropId&marketId&horizon   -> 7/14-day forecast + advice
GET /best-market?cropId     -> markets ranked by predicted tomorrow price
GET /metrics                -> per-crop MAPE / accuracy

The service trains in a background thread so /health answers immediately.
"""
import math
import os
import sqlite3
import threading
import time
from collections import defaultdict
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
import joblib

DB_PATH = os.environ.get("FARM_DB", "/home/z/my-project/db/custom.db")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
PORT = int(os.environ.get("PORT", "5001"))

STATE = {
    "ready": False,
    "training": False,
    "model": "HistGradientBoostingRegressor (scikit-learn)",
    "rows": 0,
    "trained_at": None,
    "mape": {},        # cropId -> MAPE %
    "accuracy": {},    # cropId -> accuracy %
    "error": None,
}

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------- data access
def _to_date(d):
    """Prisma stores DateTime in SQLite as epoch seconds/milliseconds."""
    if isinstance(d, (int, float)) or (isinstance(d, str) and d.isdigit()):
        v = float(d)
        if v > 1e11:  # milliseconds
            v /= 1000.0
        return datetime.utcfromtimestamp(v).strftime("%Y-%m-%d")
    return str(d)[:10]


def load_series():
    """{(crop, market): [(date_iso, modal_price), ...]} sorted by date."""
    if not os.path.exists(DB_PATH):
        return {}
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        cur = con.execute(
            "SELECT cropId, marketId, date, modalPrice FROM PriceRecord ORDER BY date"
        )
        series = defaultdict(list)
        for crop, market, d, price in cur:
            series[(crop, market)].append((_to_date(d), float(price)))
        return dict(series)
    finally:
        con.close()


# ------------------------------------------------------------------ features
def month_feats(d):
    return (
        math.sin(2 * math.pi * d.month / 12.0),
        math.cos(2 * math.pi * d.month / 12.0),
        math.sin(2 * math.pi * d.timetuple().tm_yday / 365.0),
        math.cos(2 * math.pi * d.timetuple().tm_yday / 365.0),
    )


def build_row(market_idx, n_markets, d, hist):
    """Feature vector for predicting the next price, given history list of prices."""
    p1 = hist[-1]
    lag7 = sum(hist[-7:]) / min(7, len(hist))
    lag30 = sum(hist[-30:]) / min(30, len(hist))
    feats = [0.0] * n_markets
    feats[market_idx] = 1.0
    return np.array(
        feats + list(month_feats(d))
        + [p1, lag7, lag30, p1 / lag30, hist[-2] if len(hist) > 1 else p1]
    )


def make_dataset(series, crop, n_markets, market_index):
    X, y = [], []
    for (c, m), rows in series.items():
        if c != crop or len(rows) < 40:
            continue
        prices = [p for _, p in rows]
        for i in range(31, len(rows)):
            hist = prices[:i]
            d = datetime.strptime(rows[i][0], "%Y-%m-%d").date()
            X.append(build_row(market_index[m], n_markets, d, hist))
            y.append(prices[i])
    return np.array(X), np.array(y)


# ------------------------------------------------------------------- training
def train_all():
    STATE["training"] = True
    STATE["ready"] = False
    try:
        series = load_series()
        if not series:
            STATE["error"] = "database empty — waiting for seed"
            return
        crops = sorted({c for (c, _) in series})
        markets = sorted({m for (_, m) in series})
        market_index = {m: i for i, m in enumerate(markets)}
        os.makedirs(MODEL_DIR, exist_ok=True)

        mape_all = {}
        for crop in crops:
            X, y = make_dataset(series, crop, len(markets), market_index)
            if len(X) < 500:
                continue
            split = len(X) - 60 * len(markets)  # hold out ~last 60 days
            Xtr, ytr, Xva, yva = X[:split], y[:split], X[split:], y[split:]
            model = HistGradientBoostingRegressor(
                max_iter=350, learning_rate=0.07, max_depth=None,
                early_stopping=True, validation_fraction=0.12, random_state=42,
            )
            model.fit(Xtr, ytr)
            joblib.dump(model, os.path.join(MODEL_DIR, f"{crop}.joblib"))

            if len(Xva):
                pred = model.predict(Xva)
                mape = float(np.mean(np.abs((yva - pred) / yva)) * 100)
                mape_all[crop] = round(mape, 2)

        STATE["mape"] = mape_all
        STATE["accuracy"] = {c: round(max(60.0, 100.0 - m), 1) for c, m in mape_all.items()}
        STATE["rows"] = int(sum(len(v) for v in series.values()))
        STATE["trained_at"] = datetime.utcnow().isoformat() + "Z"
        STATE["error"] = None
        STATE["ready"] = True
        print(f"[ml] training done: {len(mape_all)} models, rows={STATE['rows']}", flush=True)
    except Exception as exc:  # noqa: BLE001
        STATE["error"] = str(exc)
        print(f"[ml] training failed: {exc}", flush=True)
    finally:
        STATE["training"] = False


def ensure_models_loop():
    """Train if no models yet; retry every 15 s until the DB is seeded."""
    while not STATE["ready"]:
        models = []
        if os.path.isdir(MODEL_DIR):
            models = [f for f in os.listdir(MODEL_DIR) if f.endswith(".joblib")]
        series = load_series()
        crops = sorted({c for (c, _) in series})
        have = {f[:-7] for f in models}
        if series and all(c in have for c in crops):
            STATE["rows"] = int(sum(len(v) for v in series.values()))
            STATE["ready"] = True
            # compute accuracy from a quick validation pass in background
            threading.Thread(target=refresh_metrics, daemon=True).start()
            break
        if not STATE["training"]:
            train_all()
        time.sleep(15)


def refresh_metrics():
    """Recompute validation MAPE for existing models without retraining."""
    try:
        series = load_series()
        if not series:
            return
        crops = sorted({c for (c, _) in series})
        markets = sorted({m for (_, m) in series})
        market_index = {m: i for i, m in enumerate(markets)}
        mape_all = {}
        for crop in crops:
            path = os.path.join(MODEL_DIR, f"{crop}.joblib")
            if not os.path.exists(path):
                continue
            X, y = make_dataset(series, crop, len(markets), market_index)
            if len(X) < 600:
                continue
            Xva, yva = X[-60 * len(markets):], y[-60 * len(markets):]
            model = joblib.load(path)
            pred = model.predict(Xva)
            mape = float(np.mean(np.abs((yva - pred) / yva)) * 100)
            mape_all[crop] = round(mape, 2)
        STATE["mape"] = mape_all
        STATE["accuracy"] = {c: round(max(60.0, 100.0 - m), 1) for c, m in mape_all.items()}
        print(f"[ml] metrics refreshed for {len(mape_all)} crops", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[ml] refresh_metrics failed: {exc}", flush=True)


# ------------------------------------------------------------------ inference
def forecast(crop, market, horizon):
    model_path = os.path.join(MODEL_DIR, f"{crop}.joblib")
    if not os.path.exists(model_path):
        return None
    series = load_series()
    key = (crop, market)
    if key not in series:
        return None
    rows = series[key]
    prices = [p for _, p in rows][-90:]
    markets = sorted({m for (_, m) in series})
    market_index = {m: i for i, m in enumerate(markets)}
    model = joblib.load(model_path)

    last_date = datetime.strptime(rows[-1][0], "%Y-%m-%d").date()
    hist = list(prices)
    current = hist[-1]
    resid_std = max(1.0, float(np.std(np.diff(hist))) * 2.2)

    points = []
    for i in range(1, horizon + 1):
        d = last_date + timedelta(days=i)
        x = build_row(market_index[market], len(markets), d, hist).reshape(1, -1)
        pred = float(model.predict(x)[0])
        spread = 1.96 * resid_std * math.sqrt(1 + 0.18 * (i - 1))
        points.append({
            "date": d.isoformat(),
            "price": round(pred),
            "low": round(pred - spread),
            "high": round(pred + spread),
        })
        hist.append(pred)

    trend_pct = round((points[-1]["price"] - current) / current * 100, 1)
    avg7 = sum(p["price"] for p in points) / len(points)
    advice = "HOLD" if abs(avg7 - current) / current < 0.02 else ("WAIT" if avg7 > current else "SELL_NOW")
    return {
        "cropId": crop, "marketId": market, "horizon": horizon,
        "current": current, "points": points, "trendPct": trend_pct, "advice": advice,
        "model": {
            "type": STATE["model"],
            "mape": STATE["mape"].get(crop),
            "accuracy": STATE["accuracy"].get(crop),
        },
    }


# --------------------------------------------------------------------- routes
@app.get("/health")
def health():
    return jsonify({
        "ready": STATE["ready"],
        "training": STATE["training"],
        "model": STATE["model"],
        "rows": STATE["rows"],
        "trainedAt": STATE["trained_at"],
        "accuracy": STATE["accuracy"],
        "error": STATE["error"],
    })


@app.get("/predict")
def predict():
    crop = request.args.get("cropId", "tomato")
    market = request.args.get("marketId", "koyambedu")
    horizon = max(3, min(14, int(request.args.get("horizon", 7))))
    if not STATE["ready"]:
        return jsonify({"error": "model not ready", "training": STATE["training"]}), 503
    result = forecast(crop, market, horizon)
    if result is None:
        return jsonify({"error": "unknown crop/market"}), 404
    return jsonify(result)


@app.get("/best-market")
def best_market():
    crop = request.args.get("cropId", "tomato")
    if not STATE["ready"]:
        return jsonify({"error": "model not ready"}), 503
    series = load_series()
    markets = sorted({m for (_, m) in series})
    ranked = []
    for m in markets:
        r = forecast(crop, m, 1)
        if r:
            ranked.append({"marketId": m, "predictedTomorrow": r["points"][0]["price"]})
    ranked.sort(key=lambda x: -x["predictedTomorrow"])
    return jsonify({"cropId": crop, "ranked": ranked})


@app.get("/metrics")
def metrics():
    return jsonify({
        "model": STATE["model"],
        "mape": STATE["mape"],
        "accuracy": STATE["accuracy"],
        "rows": STATE["rows"],
        "trainedAt": STATE["trained_at"],
    })


if __name__ == "__main__":
    t = threading.Thread(target=ensure_models_loop, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=PORT, threaded=True, use_reloader=False)
