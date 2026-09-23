#!/usr/bin/env python3
"""Device UI automation for the sync spike via adb + uiautomator.
  ui.py login <user> <pass>      fill the login screen and tap LOGIN, dismissing permission dialogs
  ui.py wait <logcat> <max-s> <pkg>   wait until [SPIKE] sync_end/sync_error appears, app dies, or timeout
"""
import re, subprocess, sys, time, xml.etree.ElementTree as ET

def sh(*args, timeout=60):
    return subprocess.run(["adb", *args], capture_output=True, text=True, timeout=timeout).stdout

def dump():
    for _ in range(4):
        out = sh("shell", "uiautomator", "dump", "/sdcard/ui.xml")
        if "dumped" in out:
            xml = sh("exec-out", "cat", "/sdcard/ui.xml")
            try:
                return ET.fromstring(xml)
            except ET.ParseError:
                pass
        time.sleep(1.5)
    return None

def bounds_center(node):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
    if not m: return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2

def tap(node):
    c = bounds_center(node)
    if c: sh("shell", "input", "tap", str(c[0]), str(c[1])); time.sleep(0.8)
    return bool(c)

def nodes(root, pred):
    return [n for n in root.iter("node") if pred(n)] if root is not None else []

DIALOG_BUTTONS = {"allow", "ok", "continue", "got it", "yes", "allow only while using the app", "while using the app"}

def dismiss_dialogs(root):
    hit = False
    for n in nodes(root, lambda n: (n.get("text") or "").strip().lower() in DIALOG_BUTTONS and n.get("clickable") == "true"):
        print("dismiss:", n.get("text")); tap(n); hit = True
    return hit

def type_text(s):
    sh("shell", "input", "text", s.replace(" ", "%s"))
    time.sleep(0.5)

def login(user, pw):
    deadline = time.time() + 120
    while time.time() < deadline:
        root = dump()
        if root is None: time.sleep(2); continue
        if dismiss_dialogs(root): continue
        edits = sorted(nodes(root, lambda n: n.get("class") == "android.widget.EditText"), key=lambda n: bounds_center(n)[1] if bounds_center(n) else 0)
        if len(edits) >= 2:
            print("login screen found, fields:", len(edits))
            tap(edits[0]); type_text(user)
            tap(edits[1]); type_text(pw)
            sh("shell", "input", "keyevent", "KEYCODE_BACK"); time.sleep(0.8)  # hide keyboard
            root = dump()
            btn = nodes(root, lambda n: (n.get("text") or "").strip().upper() == "LOGIN")
            if not btn:
                btn = nodes(root, lambda n: "login" in (n.get("content-desc") or "").lower())
            if btn:
                tap(btn[-1]); print("tapped LOGIN"); break
            print("LOGIN button not found; retrying"); time.sleep(2)
        else:
            time.sleep(2)
    else:
        print("login screen never appeared"); return 1
    # settle: dismiss anything that pops in the first two minutes after login
    for _ in range(24):
        time.sleep(5)
        root = dump()
        dismiss_dialogs(root)
        txt = " | ".join((n.get("text") or "") for n in nodes(root, lambda n: n.get("text")))
        if re.search(r"invalid|incorrect|wrong|failed|error", txt, re.I) and "LOGIN" in txt:
            print("login error on screen:", txt[:300]); return 2
    return 0

def wait(logcat, max_s, pkg):
    start = time.time(); last_ui = 0; last_report = 0
    while time.time() - start < max_s:
        try:
            with open(logcat, errors="ignore") as f: text = f.read()
        except FileNotFoundError:
            text = ""
        if '"ev":"sync_end"' in text: print("sync_end seen after %ds" % (time.time() - start)); return 0
        if '"ev":"sync_error"' in text: print("sync_error seen after %ds" % (time.time() - start)); return 1
        if "FATAL EXCEPTION" in text: print("app crashed"); return 3
        if time.time() - start > 30 and not sh("shell", "pidof", pkg).strip():
            print("app process gone"); return 4
        if time.time() - last_ui > 60:
            last_ui = time.time(); dismiss_dialogs(dump())
        if time.time() - last_report > 120:
            last_report = time.time()
            pages = text.count('"ev":"page"'); print("... %ds, %d pages so far" % (time.time() - start, pages), flush=True)
        time.sleep(10)
    print("timeout after %ds" % max_s); return 5

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "login": sys.exit(login(sys.argv[2], sys.argv[3]))
    if cmd == "wait": sys.exit(wait(sys.argv[2], int(sys.argv[3]), sys.argv[4]))
    if cmd == "dump":
        root = dump(); print("\n".join(f"{n.get('class')} text={n.get('text')!r} desc={n.get('content-desc')!r} {n.get('bounds')}" for n in nodes(root, lambda n: n.get('text') or n.get('content-desc') or n.get('class')=='android.widget.EditText')))
    if cmd == "dismiss": dismiss_dialogs(dump())
