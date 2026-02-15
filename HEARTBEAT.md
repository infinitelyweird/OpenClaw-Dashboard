# HEARTBEAT.md

## Auto-start Dashboard Server
- Check if port 3000 is listening: `Get-NetTCPConnection -LocalPort 3000`
- If NOT listening, start detached: `Start-Process -FilePath "node" -ArgumentList "app.js" -WorkingDirectory "I:\OpenClaw" -WindowStyle Hidden -RedirectStandardOutput "I:\OpenClaw\server.log" -RedirectStandardError "I:\OpenClaw\server-err.log"`
- Wait 3s then verify port is up
