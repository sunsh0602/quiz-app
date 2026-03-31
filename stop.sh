#!/bin/bash
kill $(lsof -t -i:8000) 2>/dev/null && echo "서버가 종료되었습니다." || echo "실행 중인 서버가 없습니다."
