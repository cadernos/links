#!/usr/bin/env python3
"""Atualiza artigos recentes (OAI-PMH) e anúncios (página pública do OJS).

Princípios:
- não reescrever JSON quando o conteúdo editorial não mudou;
- preservar o último conjunto válido se uma fonte falhar;
- sinalizar erro ao GitHub Actions quando os dados preservados já estiverem > 7 dias sem atualização;
- guardar variantes linguísticas quando a fonte as expuser.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

ROOT = Path(__file__).resolve().parents[1]
OAI_BASE = "https://cadernos.abralin.org/index.php/cadernos/oai"
ANNOUNCEMENTS = "https://cadernos.abralin.org/index.php/cadernos/announcement"
USER_AGENT = "CadLinLinksBot/1.1 (+https://cadernos.abralin.org/)"
STALE_AFTER_DAYS = 7
NS = {
    "oai": "http://www.openarchives.org/OAI/2.0/",
    "oai_dc": "http://www.openarchives.org/OAI/2.0/oai_dc/",
    "dc": "http://purl.org/dc/elements/1.1/",
}
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"


def fetch(url: str, timeout: int = 45, accept_language: str | None = None) -> bytes:
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if accept_language:
        headers["Accept-Language"] = accept_language
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def txt(el) -> str:
    return " ".join("".join(el.itertext()).split()) if el is not None else ""


def lang_key(raw: str | None) -> str:
    value = (raw or "").lower().replace("_", "-")
    if value.startswith("pt"):
        return "pt"
    if value.startswith("en"):
        return "en"
    if value.startswith("es"):
        return "es"
    if value.startswith("fr"):
        return "fr"
    return value.split("-", 1)[0] if value else ""


def localized_values(elements) -> tuple[dict[str, str], str]:
    variants: dict[str, str] = {}
    fallback = ""
    for el in elements:
        value = txt(el)
        if not value:
            continue
        if not fallback:
            fallback = value
        key = lang_key(el.attrib.get(XML_LANG))
        if key and key not in variants:
            variants[key] = value
    return variants, fallback


def parse_iso_date(values, fallback="") -> str:
    for value in values:
        m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", value or "")
        if m:
            return m.group(1)
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", fallback or "")
    return m.group(1) if m else ""


def normalize_doi(values) -> str:
    for v in values:
        m = re.search(r"(?:doi\.org/|doi:\s*)?(10\.\d{4,9}/[^\s<>\"]+)", v, flags=re.I)
        if m:
            return m.group(1).rstrip(".,;)")
    return ""


def article_url(values, doi: str) -> str:
    for v in values:
        candidate = v.strip()
        if "cadernos.abralin.org" in candidate and "/article/view/" in candidate:
            return candidate
    return f"https://doi.org/{doi}" if doi else ""


def normalize_creator(value: str) -> str:
    value = " ".join((value or "").split())
    if value.count(",") == 1:
        surname, given = [part.strip() for part in value.split(",", 1)]
        if surname and given:
            return f"{given} {surname}"
    return value


def harvest_articles(limit=8):
    since = (date.today() - timedelta(days=370)).isoformat()
    params = {"verb": "ListRecords", "metadataPrefix": "oai_dc", "from": since}
    url = OAI_BASE + "?" + urllib.parse.urlencode(params)
    records = []
    seen = set()
    page_guard = 0

    while url and page_guard < 30:
        page_guard += 1
        root = ET.fromstring(fetch(url))
        for rec in root.findall(".//oai:record", NS):
            header = rec.find("oai:header", NS)
            if header is not None and header.attrib.get("status") == "deleted":
                continue
            dc = rec.find(".//oai_dc:dc", NS)
            if dc is None:
                continue

            title_elements = dc.findall("dc:title", NS)
            titles, title = localized_values(title_elements)
            creators = [normalize_creator(txt(e)) for e in dc.findall("dc:creator", NS) if txt(e)]
            identifiers = [txt(e) for e in dc.findall("dc:identifier", NS) if txt(e)]
            dates = [txt(e) for e in dc.findall("dc:date", NS) if txt(e)]
            header_date = txt(rec.find("oai:header/oai:datestamp", NS))
            doi = normalize_doi(identifiers)
            url_value = article_url(identifiers, doi)
            pub_date = parse_iso_date(dates, header_date)
            if not title or not url_value or not pub_date:
                continue

            key = doi or url_value
            if key in seen:
                continue
            seen.add(key)
            item = {
                "date": pub_date,
                "title": title,
                "authors": creators,
                "doi": doi,
                "url": url_value,
            }
            if titles:
                item["titles"] = titles
            records.append(item)

        token_el = root.find(".//oai:resumptionToken", NS)
        token = txt(token_el)
        if token:
            url = OAI_BASE + "?" + urllib.parse.urlencode({"verb": "ListRecords", "resumptionToken": token})
        else:
            url = ""

    records.sort(key=lambda x: (x["date"], x["title"]), reverse=True)
    return records[:limit]


def parse_announcement_page(html: bytes, base_url: str):
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 não instalado")
    soup = BeautifulSoup(html.decode("utf-8", errors="replace"), "html.parser")
    items = []
    seen = set()
    candidates = soup.select("article.obj_announcement_summary")
    if not candidates:
        candidates = [a.parent for a in soup.find_all("a", href=re.compile(r"/announcement/view/\d+"))]

    for node in candidates:
        link = node.find("a", href=re.compile(r"/announcement/view/\d+")) if hasattr(node, "find") else None
        if not link:
            continue
        href = urllib.parse.urljoin(base_url, link.get("href", ""))
        if not href or href in seen:
            continue
        seen.add(href)
        title = " ".join(link.get_text(" ", strip=True).split())
        date_node = node.select_one(".date") if hasattr(node, "select_one") else None
        date_text = date_node.get_text(" ", strip=True) if date_node else node.get_text(" ", strip=True)
        m = re.search(r"(\d{1,2})[./-](\d{1,2})[./-](\d{4})", date_text)
        iso = ""
        if m:
            d, mo, y = map(int, m.groups())
            iso = f"{y:04d}-{mo:02d}-{d:02d}"
        if title:
            items.append({"date": iso, "title": title, "url": href})
    return items


def harvest_news(limit=6):
    locale_sources = {
        "pt": (ANNOUNCEMENTS + "?locale=pt_BR", "pt-BR,pt;q=0.9"),
        "en": (ANNOUNCEMENTS + "?locale=en_US", "en-US,en;q=0.9"),
    }
    merged: dict[str, dict] = {}
    errors = []

    for locale, (url, accept_language) in locale_sources.items():
        try:
            items = parse_announcement_page(fetch(url, accept_language=accept_language), ANNOUNCEMENTS)
        except Exception as exc:
            errors.append(f"{locale}: {exc}")
            continue
        for item in items:
            row = merged.setdefault(item["url"], {"date": item["date"], "title": item["title"], "titles": {}, "url": item["url"]})
            if item["date"] and not row.get("date"):
                row["date"] = item["date"]
            row["titles"][locale] = item["title"]
            if not row.get("title"):
                row["title"] = item["title"]

    if not merged:
        raise RuntimeError("; ".join(errors) if errors else "Nenhum anúncio encontrado")

    items = list(merged.values())
    for item in items:
        if len(set(item["titles"].values())) <= 1:
            item.pop("titles", None)
    items.sort(key=lambda x: x.get("date", ""), reverse=True)
    return items[:limit]


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_json_if_changed(path: Path, source: str, key: str, items) -> bool:
    existing = load_json(path)
    if existing.get("source") == source and existing.get(key) == items:
        return False
    payload = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": source,
        key: items,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def is_stale(path: Path, days: int = STALE_AFTER_DAYS) -> bool:
    existing = load_json(path)
    raw = existing.get("updatedAt")
    if not raw:
        return True
    try:
        updated = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return True
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - updated > timedelta(days=days)


def update_source(label: str, path: Path, source: str, key: str, harvester) -> bool:
    try:
        items = harvester()
        if not items:
            raise RuntimeError("a fonte não retornou itens válidos")
        changed = write_json_if_changed(path, source, key, items)
        print(f"{label}: {len(items)} ({'atualizado' if changed else 'sem mudança'})")
        return True
    except Exception as exc:
        stale = is_stale(path)
        level = "ERRO" if stale else "AVISO"
        print(f"{level}: {label.lower()} não atualizados: {exc}", file=sys.stderr)
        if stale:
            print(f"ERRO: último JSON válido tem mais de {STALE_AFTER_DAYS} dias ou não possui data válida.", file=sys.stderr)
        return not stale


def main():
    ok_articles = update_source("Artigos", ROOT / "data" / "articles.json", OAI_BASE, "articles", harvest_articles)
    ok_news = update_source("Notícias", ROOT / "data" / "news.json", ANNOUNCEMENTS, "news", harvest_news)
    return 0 if (ok_articles and ok_news) else 1


if __name__ == "__main__":
    raise SystemExit(main())
