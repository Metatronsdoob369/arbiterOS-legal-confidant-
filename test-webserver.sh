#!/bin/bash
export PLAYWRIGHT_SKIP_WEB_SERVER=
npm run seed:admin && npm run dev &
SERVER_PID=$!
sleep 5
curl -I http://127.0.0.1:4321
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null
