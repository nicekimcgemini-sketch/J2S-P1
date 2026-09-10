#!/usr/bin/env bash
# J2S-P1 검증 하네스 (bash 버전). 커밋/배포 전에 실행해서 세 모듈이 모두 정상인지 확인한다.
#
#   backend        : Maven Wrapper 로 단위/슬라이스 테스트 실행 (H2, Supabase 접속 불필요)
#   frontend-admin : tsc --noEmit 타입체크 + vite 프로덕션 빌드
#   mobile-app     : tsc --noEmit 타입체크 (android/ios 네이티브 프로젝트가 없어 빌드는 생략)
#
# 사용법:
#   ./scripts/check.sh                # 전체
#   ./scripts/check.sh --backend      # 백엔드만
#   ./scripts/check.sh --frontend     # frontend-admin 만
#   ./scripts/check.sh --mobile       # mobile-app 만
#   ./scripts/check.sh --frontend --skip-build   # 타입체크만, vite build 생략

set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_backend=0
run_frontend=0
run_mobile=0
skip_build=0

if [ "$#" -eq 0 ]; then
    run_backend=1; run_frontend=1; run_mobile=1
else
    for arg in "$@"; do
        case "$arg" in
            --backend) run_backend=1 ;;
            --frontend) run_frontend=1 ;;
            --mobile) run_mobile=1 ;;
            --skip-build) skip_build=1 ;;
            *) echo "알 수 없는 옵션: $arg" >&2; exit 2 ;;
        esac
    done
fi

declare -a step_names=()
declare -a step_results=()

run_step() {
    local name="$1" dir="$2"; shift 2
    echo ""
    echo "==> $name"
    if (cd "$dir" && "$@"); then
        step_names+=("$name"); step_results+=("OK")
        echo "[OK] $name"
    else
        step_names+=("$name"); step_results+=("FAIL")
        echo "[FAIL] $name"
    fi
}

ensure_node_modules() {
    local dir="$1" label="$2"
    if [ ! -d "$dir/node_modules" ]; then
        run_step "$label: npm install" "$dir" npm install
    fi
}

if [ "$run_backend" -eq 1 ]; then
    run_step "backend: mvn test (H2, Supabase 미접속)" "$repo_root/backend" ./mvnw -B test
fi

if [ "$run_frontend" -eq 1 ]; then
    fe_dir="$repo_root/frontend-admin"
    ensure_node_modules "$fe_dir" "frontend-admin"
    run_step "frontend-admin: typecheck" "$fe_dir" npm run typecheck
    if [ "$skip_build" -eq 0 ]; then
        run_step "frontend-admin: build" "$fe_dir" npm run build
    fi
fi

if [ "$run_mobile" -eq 1 ]; then
    mobile_dir="$repo_root/mobile-app"
    ensure_node_modules "$mobile_dir" "mobile-app"
    run_step "mobile-app: typecheck (android/ios 네이티브 빌드는 스캐폴딩 미완성으로 생략)" "$mobile_dir" npm run typecheck
fi

echo ""
echo "================ 결과 요약 ================"
fail_count=0
for i in "${!step_names[@]}"; do
    if [ "${step_results[$i]}" = "OK" ]; then
        echo "[OK]   ${step_names[$i]}"
    else
        echo "[FAIL] ${step_names[$i]}"
        fail_count=$((fail_count + 1))
    fi
done

echo ""
if [ "$fail_count" -gt 0 ]; then
    echo "${fail_count}개 단계 실패."
    exit 1
else
    echo "모든 검증 통과."
    exit 0
fi
