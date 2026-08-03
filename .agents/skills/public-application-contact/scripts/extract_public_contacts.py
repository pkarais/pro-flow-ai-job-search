#!/usr/bin/env python3
"""Extract public contact candidates from saved HTML without network access."""

from __future__ import annotations
import argparse, html, json, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

EMAIL_RE = re.compile(r"(?<![\w.+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})(?![\w.-])", re.I)
CAREER_RE = re.compile(r"\b(career|careers|job|jobs|join us|recruit|recruiting|talent|human resources|hr|apply|application)\b", re.I)
CONTACT_RE = re.compile(r"\b(contact|inquiry|enquiry|consult|reach us|get in touch|phone|email)\b", re.I)
EXCLUDE_RE = re.compile(r"\b(sales|support|billing|press|media|investor|privacy|legal|abuse|security|webmaster|no[-_. ]?reply)\b", re.I)
PLACEHOLDER_RE = re.compile(r"^(you|your|name|email|user|example|test|someone|person)@|@(example\.com|company\.com|domain\.com)$", re.I)

class ContactParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.links=[]; self.forms=[]; self.cfemails=[]; self.link=None; self.form=None; self.parts=[]
    def handle_starttag(self, tag, attrs):
        data={key.lower(): value or "" for key,value in attrs}
        if tag.lower()=="a": self.link={"href":data.get("href", ""),"text":""}
        elif tag.lower()=="form": self.form={"action":data.get("action", ""),"method":data.get("method", "get").upper(),"text":""}
        if data.get("data-cfemail"): self.cfemails.append(data["data-cfemail"])
    def handle_endtag(self, tag):
        if tag.lower()=="a" and self.link is not None: self.links.append(self.link); self.link=None
        elif tag.lower()=="form" and self.form is not None: self.forms.append(self.form); self.form=None
    def handle_data(self, data):
        value=" ".join(data.split())
        if not value: return
        self.parts.append(value)
        if self.link is not None: self.link["text"]=(self.link["text"]+" "+value).strip()
        if self.form is not None: self.form["text"]=(self.form["text"]+" "+value).strip()
    @property
    def text(self): return " ".join(self.parts)

def decode_cfemail(value):
    try:
        raw=bytes.fromhex(value); key=raw[0]; return "".join(chr(byte ^ key) for byte in raw[1:])
    except (ValueError, IndexError): return None

def host(value):
    return (urlparse(value if "://" in value else "https://"+value).hostname or "").lower().removeprefix("www.")

def same_domain(candidate, official):
    return bool(official) and (candidate==official or candidate.endswith("."+official))

def nearby(text, needle, width=180):
    index=text.lower().find(needle.lower())
    return "" if index<0 else " ".join(text[max(0,index-width):min(len(text),index+len(needle)+width)].split())

def classify(address, context, official):
    local, domain=address.lower().rsplit("@",1)
    if PLACEHOLDER_RE.search(address): return "not_usable","none","placeholder or example address"
    if official and not same_domain(host(domain), official): return "not_usable","none","outside verified employer domain"
    if EXCLUDE_RE.search(local) and not CAREER_RE.search(context): return "not_usable","none","non-recruiting function"
    if CAREER_RE.search(local+" "+context): return "recruiting_or_hr","high","published in hiring context"
    return "general_company_contact","medium","published employer address without explicit hiring context"

def extract(source, source_url, official_domain):
    decoded=unquote(html.unescape(source)); parser=ContactParser(); parser.feed(decoded); searchable=decoded+" "+parser.text; official=host(official_domain)
    found={match.group(1).lower() for match in EMAIL_RE.finditer(searchable)}
    for encoded in parser.cfemails:
        value=decode_cfemail(encoded)
        if value and EMAIL_RE.fullmatch(value): found.add(value.lower())
    emails=[]
    for address in sorted(found):
        context=nearby(searchable,address); kind,confidence,reason=classify(address,context,official)
        emails.append({"value":address,"type":kind,"confidence":confidence,"reason":reason,"context":context[:400],"sourceUrl":source_url})
    links=[]
    for item in parser.links:
        label=" ".join(item["text"].split()); href=item["href"].strip()
        if not href or href.lower().startswith(("javascript:","mailto:","tel:")): continue
        absolute=urljoin(source_url,href)
        if CAREER_RE.search(label+" "+href) and (not official or same_domain(host(absolute),official)):
            links.append({"type":"official_careers_page","value":absolute,"label":label,"sourceUrl":source_url})
    forms=[]
    for item in parser.forms:
        label=" ".join(item["text"].split())[:300]
        if CAREER_RE.search(label) or CONTACT_RE.search(label):
            kind="official_careers_page" if CAREER_RE.search(label) else "general_company_contact"
            forms.append({"type":kind,"value":urljoin(source_url,item["action"] or source_url),"method":item["method"],"label":label,"sourceUrl":source_url})
    return {"emails":emails,"links":links,"forms":forms}

def main():
    cli=argparse.ArgumentParser(description=__doc__); cli.add_argument("input",type=Path); cli.add_argument("--source-url",required=True); cli.add_argument("--official-domain",required=True); args=cli.parse_args()
    print(json.dumps(extract(args.input.read_text(encoding="utf-8",errors="replace"),args.source_url,args.official_domain),indent=2,ensure_ascii=False))

if __name__=="__main__": main()
