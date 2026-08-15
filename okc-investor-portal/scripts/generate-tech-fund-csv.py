"""
Generate a broker-deal CSV for the OKC Tech Fund from REAL QQQ daily bars
pulled out of MetaTrader 5.

MT5 exposes price bars, not deal history -- there is no real QQQ trading
account to export. So the PRICES and therefore the daily returns are real
market data; the deal rows around them are constructed to realise that P&L.

Strategy modelled: hold a fixed QQQ position, marked to market daily. Each
trading day the position is closed at that day's close (realising the move
since the previous close) and immediately reopened, so the fund's daily P&L
equals SHARES x (close_today - close_prev). The position is closed out for
good on the final day, leaving the fund in cash.

Output matches the firm's workbook export format (sample-data-portal.csv):
unnamed index column, Excel-serial `time` plus unix-ms `time_msc`, string
type/entry.
"""
import csv
from datetime import datetime, timezone, timedelta

import MetaTrader5 as mt5

SYMBOL = "QQQ"
START = datetime(2026, 1, 1)
END = datetime(2026, 8, 1)

SHARES = 800           # position held, in shares
CAPITAL = 500_000.00   # opening deposit, USD
COMMISSION_PER_SIDE = -2.00
TICKET_BASE = 700_000_000   # existing data tops out around 224M
MAGIC = 20260101

EXCEL_EPOCH_OFFSET_DAYS = 25569
OUT_PATH = "okc-tech-fund-qqq.csv"


def excel_serial(dt: datetime) -> float:
    return dt.timestamp() / 86400 + EXCEL_EPOCH_OFFSET_DAYS


def main():
    if not mt5.initialize():
        raise SystemExit(f"MT5 initialize failed: {mt5.last_error()}")
    mt5.symbol_select(SYMBOL, True)
    rates = mt5.copy_rates_range(SYMBOL, mt5.TIMEFRAME_D1, START, END)
    mt5.shutdown()

    if rates is None or len(rates) < 2:
        raise SystemExit("no QQQ bars returned")

    bars = [
        (datetime.fromtimestamp(r[0], tz=timezone.utc).replace(tzinfo=timezone.utc), float(r[4]))
        for r in rates
    ]
    print(f"{len(bars)} QQQ bars  {bars[0][0]:%Y-%m-%d} -> {bars[-1][0]:%Y-%m-%d}")

    rows = []
    ticket = TICKET_BASE
    position_id = TICKET_BASE

    def add(dt, type_, entry, price, profit, comment, volume=SHARES, commission=COMMISSION_PER_SIDE):
        nonlocal ticket
        ticket += 1
        rows.append({
            "ticket": ticket,
            "order": ticket + 500_000,
            "time": f"{excel_serial(dt):.9f}",
            "time_msc": int(dt.timestamp() * 1000),
            "type": type_,
            "entry": entry,
            "magic": MAGIC,
            "position_id": position_id,
            "reason": "EXPERT",
            "volume": volume,
            "price": f"{price:.2f}",
            "commission": f"{commission:.2f}",
            "swap": 0,
            "profit": f"{profit:.2f}",
            "fee": 0,
            "symbol": SYMBOL if type_ != "balance" else "",
            "comment": comment,
            "external_id": "",
        })

    # Opening deposit. The importer deliberately EXCLUDES balance rows and tells
    # ops to record them as a fund flow instead -- same as the firm's file.
    first_day = bars[0][0]
    add(first_day.replace(hour=13, minute=0) - timedelta(days=1),
        "balance", "IN", 0, CAPITAL, "Tech Fund seed deposit", volume=0, commission=0)

    # Day 0: open the position at the close.
    d0, c0 = bars[0]
    add(d0.replace(hour=20, minute=0), "buy", "IN", c0, 0.0, "open QQQ position")

    prev_close = c0
    for day, close in bars[1:]:
        pnl = SHARES * (close - prev_close)
        position_id += 1
        # Realise the move since the previous close.
        add(day.replace(hour=20, minute=0), "sell", "OUT", close, pnl, "daily mark-to-market")
        # Reopen at the same close, unless this is the final bar.
        if (day, close) != bars[-1]:
            add(day.replace(hour=20, minute=0, second=5), "buy", "IN", close, 0.0, "reopen QQQ position")
        prev_close = close

    fieldnames = ["", "ticket", "order", "time", "time_msc", "type", "entry", "magic",
                  "position_id", "reason", "volume", "price", "commission", "swap",
                  "profit", "fee", "symbol", "comment", "external_id"]

    with open(OUT_PATH, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for i, row in enumerate(rows):
            writer.writerow({"": i, **row})

    # ---- verification summary ----
    trade_rows = [r for r in rows if r["type"] != "balance"]
    total_pnl = sum(float(r["profit"]) for r in trade_rows)
    total_comm = sum(float(r["commission"]) for r in trade_rows)
    net = total_pnl + total_comm
    qqq_move = (bars[-1][1] / bars[0][1] - 1) * 100

    print(f"\nwrote {OUT_PATH}: {len(rows)} rows ({len(trade_rows)} trades + 1 balance)")
    print(f"QQQ close {bars[0][1]:.2f} -> {bars[-1][1]:.2f}   ({qqq_move:+.2f}%)")
    print(f"position: {SHARES} shares, capital {CAPITAL:,.2f}")
    print(f"gross P&L {total_pnl:+,.2f}   commission {total_comm:+,.2f}   net {net:+,.2f}")
    print(f"fund return on capital: {net / CAPITAL * 100:+.2f}%")
    print(f"check: SHARES x price move = {SHARES * (bars[-1][1] - bars[0][1]):+,.2f}")


if __name__ == "__main__":
    main()
