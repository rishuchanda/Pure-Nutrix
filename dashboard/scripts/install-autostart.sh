#!/bin/bash
# Makes start-all.sh run automatically every time you log in to the Mac.
# Undo:  launchctl unload ~/Library/LaunchAgents/in.purenutrix.dashboard.plist && rm that file
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/in.purenutrix.dashboard.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>in.purenutrix.dashboard</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$ROOT/scripts/start-all.sh</string></array>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$ROOT/data/logs/autostart.log</string>
  <key>StandardErrorPath</key><string>$ROOT/data/logs/autostart.log</string>
</dict></plist>
PL
launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST" && echo "✓ Autostart on: dashboard, panel-reader and n8n will start at every login."
