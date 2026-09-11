# J2S-P1 · 협력사 출퇴근 관리 시스템

현장 PC가 1회용 QR을 띄우고, 작업자가 승인된 모바일 기기로 스캔해 출퇴근을 기록하는 시스템.
모든 응답과 커밋 메시지 본문 설명은 **한국어**로 작성한다 (커밋 제목은 기존 이력처럼 영어 명령문도 허용).

## 모듈 구성

| 경로 | 스택 | 역할 |
|---|---|---|
| `backend/` | Spring Boot 3.3 · Java 17 · JPA · Spring Security · PostgreSQL(Supabase) | REST API |
| `frontend-admin/` | React 18 · Vite 5 · TypeScript | `/qr` 현장 QR 화면(공개), `/checkin` 모바일 웹 체크인, `/admin/**` 관리자 콘솔(로그인) |
| `mobile-app/` | React Native 0.74 · TypeScript | 작업자용 네이티브 스캔 앱 (스캐폴딩 단계, android/ios 폴더 미생성) |
| `scripts/` | PowerShell / Bash / Node | 검증 하네스 (`check.ps1`, `check.sh`, `hooks/`) |

배포: Cloud Build → Cloud Run (`backend/cloudbuild.yaml`, `frontend-admin/cloudbuild.yaml`, region asia-northeast3, GCP 프로젝트 `j2s-p1-attendance`). `main` 푸시 시 자동 배포되므로 **main에 올리기 전에 반드시 검증 스크립트를 통과**시킨다.

| 서비스 | 배포 URL |
|---|---|
| 백엔드 (`j2s-backend`) | https://j2s-backend-401796347608.asia-northeast3.run.app |
| 프론트엔드 (`j2s-frontend`) | https://j2s-frontend-401796347608.asia-northeast3.run.app |

(`gcloud run services list --region=asia-northeast3`로 최신 상태 재확인 가능)

## 명령어

로컬에는 전역 `mvn`, `docker`가 없다. 백엔드는 항상 **Maven Wrapper**(`backend/mvnw`, `mvnw.cmd`)를 쓴다.

```powershell
# 전체 검증 (백엔드 테스트 + 프론트 타입체크/빌드). 커밋 전 필수
.\scripts\check.ps1            # bash: ./scripts/check.sh
.\scripts\check.ps1 -Backend   # 일부만: -Backend / -Frontend / -Mobile

# 백엔드
cd backend; .\mvnw -B -q test                     # 단위/슬라이스 테스트 (DB 불필요, H2 test 프로파일)
cd backend; .\mvnw -B -q -DskipTests compile      # 컴파일만
cd backend; .\mvnw spring-boot:run                # 실행 (루트 .env 의 SUPABASE_* 환경변수 필요)

# 관리자 프론트
cd frontend-admin; npm run typecheck              # tsc --noEmit
cd frontend-admin; npm run build                  # tsc + vite build
cd frontend-admin; npm run dev                    # http://localhost:5173

# 모바일 (node_modules 설치 후)
cd mobile-app; npm install; npm run typecheck
```

백엔드 테스트는 `src/test/resources/application-test.yml` 의 H2 인메모리 DB를 쓰므로 Supabase 접속 없이 돌아간다. 실행 시에는 루트 `.env` 를 읽지 않으니 `SUPABASE_JDBC_URL`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD` 를 셸 환경변수로 넘겨야 한다.

## 도메인 흐름 (변경 시 반드시 유지할 불변식)

1. **QR 발급** `GET /api/qr/generate` — `IpWhitelistFilter` 가 `/api/qr/**` 를 화이트리스트 IP(`ip_whitelist` 테이블)로 제한. 토큰은 UUID, 유효 `app.qr.expiry-seconds`(60s). 화면(`QrScreen.tsx`)에는 토큰을 그대로 노출하지 않고 `/checkin?t=<token>` 주소로 인코딩한 QR 하나만 보여준다 — 등록/미등록 여부와 상관없이 이 QR 하나만 스캔하면 되고, `CheckIn.tsx`가 `t` 쿼리파라미터 유무로 "바로 처리" 와 "페이지 내 카메라로 재스캔"(북마크 등으로 토큰 없이 들어온 경우의 대체 경로) 을 자동 분기한다. QR 두 개(체크인용/등록용)를 따로 보여주는 옛 방식으로 되돌리지 말 것 — 사용자 혼동 문제로 의도적으로 통합함. 모바일 웹의 기기 ID(`frontend-admin/src/services/deviceId.ts`)는 카메라 앱이 링크를 임시 인앱 브라우저로 열어 매번 저장공간이 초기화되는 경우를 대비해 `localStorage`+쿠키(5년) 이중 저장으로 동기화한다 — 완전한 프라이빗 모드까지는 못 막지만 가장 흔한 원인은 방어한다.
2. **QR 1회용** — `QrService.validateAndInvalidate` 가 조회·만료검사·`usedAt` 설정을 한 트랜잭션에서 처리. 재사용/만료/미존재는 모두 `false`. 이 메서드를 우회해 출퇴근을 기록하는 코드를 만들지 말 것.
3. **기기 승인** — `Device.status` PENDING → APPROVED → REVOKED. 출퇴근 API는 `APPROVED` 기기만 통과(`AttendanceService.validateDevice`: 미등록 401, 미승인 403).
4. **최초 등록 = 작업자 자가 생성** — `POST /api/devices/register` 는 사번(`^S\d{5}$`)이 없으면 이름과 함께 `Worker` 를 생성한다. 같은 사번에 PENDING/APPROVED 기기가 있으면 409.
5. **출근은 하루 1회** — `hasCheckedInToday` 로 중복 출근 409. 퇴근은 제한 없음.
6. **관리자 인증** — HTTP Basic, `SecurityConfig` 의 인메모리 `admin` 계정(운영 전 DB 기반으로 교체 예정 TODO). `/api/admin/**` 만 `ROLE_ADMIN`, 나머지 `/api/**` 는 permitAll 이고 기기ID/IP로 방어.
7. **시간대** — 서버는 `Asia/Seoul` 고정(Dockerfile `-Duser.timezone`). 날짜 경계 계산(`LocalDate.now()`)은 이 전제를 따른다.

## API 요약

| 메서드/경로 | 인증 | 비고 |
|---|---|---|
| `GET /api/qr/generate` | IP 화이트리스트 | `{token, expiresAt, expiresInSeconds}` |
| `POST /api/devices/register` | 없음 | 201, `DeviceRegisterDto` 검증 |
| `GET /api/devices/status?hardwareId=` | 없음 | `{status, workerName, checkedInToday, checkInAt, checkOutAt}` / `NOT_REGISTERED` — `checkInAt`/`checkOutAt`은 당일 최신 기록, 없으면 `null` |
| `POST /api/attendance/check-in`, `check-out` | 없음(기기ID 검증) | `{qrToken, hardwareId}` |
| `GET /api/admin/me` | ADMIN | 로그인 확인 |
| `GET /api/admin/devices`, `/devices/pending` | ADMIN | |
| `PATCH /api/admin/devices/{id}/status?status=` | ADMIN | APPROVED / REVOKED |
| `DELETE /api/admin/devices/{id}` | ADMIN | 출퇴근 기록 있으면 409 |
| `GET/POST/DELETE /api/admin/ip-whitelist[/{id}]` | ADMIN | |
| `GET /api/admin/attendance/logs?date=YYYY-MM-DD` | ADMIN | |

프론트의 타입/호출은 `frontend-admin/src/services/api.ts` 한 곳에 모여 있다. 백엔드 응답 형태를 바꾸면 이 파일의 인터페이스도 같이 고친다.

## 코드 규칙

- **백엔드**: Lombok(`@RequiredArgsConstructor`, `@Getter/@Setter`, `@Builder`) 사용. 오류는 `ResponseStatusException` 으로 HTTP 상태와 한국어 메시지를 함께 던진다. `@Valid` 실패 메시지는 `GlobalExceptionHandler` 가 그대로 노출한다. 엔티티 직렬화 순환(`Worker.devices` 는 `@JsonIgnore`)을 깨지 말 것. 새 조회 API는 LAZY 연관을 `JOIN FETCH` 로 미리 가져온다(`findAllWithWorker` 패턴).
- **DB 스키마**: `ddl-auto: update` 에 의존한다. 컬럼 추가는 nullable 로 시작하고, 이름 변경/삭제는 Supabase 콘솔에서 수동 마이그레이션이 필요하므로 반드시 사용자에게 알린다.
- **프론트**: 스타일링은 Tailwind CSS v4(`@tailwindcss/vite` 플러그인, `src/index.css` 의 `@theme` 블록에 `brand` 색상/폰트 토큰 정의)로 전면 전환했다. 클래스 기반 CSS 파일(`theme.css`)은 삭제됨 — 새 UI는 전부 Tailwind 유틸리티 클래스로 작성한다. 반복되는 패턴(통계 카드, 상태 배지, 패널, 버튼, 입력 필드)은 `src/components/dashboard.tsx` 의 공용 컴포넌트를 재사용한다. 아이콘은 `lucide-react`. 다크 "운영 콘솔" 톤(슬레이트 배경 + 인디고 액센트 + 에메랄드/앰버/로즈 상태색)으로 통일했으니 새 화면도 이 톤을 따른다. 상태는 컴포넌트 로컬 `useState`, 전역 상태 라이브러리 없음. 관리자 인증 토큰은 `sessionStorage` 의 `admin_auth`.
- **비밀값**: 루트 `.env`, `frontend-admin/.env`, `mobile-app/.env` 는 절대 읽거나 커밋하지 않는다(훅이 차단). 예시는 `.env.example` 에만 추가한다. `SecurityConfig` 의 `admin1234` 는 개발용 기본값이며, 운영 값은 환경변수로 뺀다.

## 작업 완료 기준 (Definition of Done)

1. `.\scripts\check.ps1` 전부 통과 (수정한 모듈에 맞춰 `-Backend` 등으로 좁혀도 되지만 커밋 전엔 전체).
2. 백엔드 로직 변경 시 `backend/src/test` 에 대응 테스트 추가/수정. 서비스 계층은 Mockito 단위 테스트, 보안/필터/컨트롤러는 `@WebMvcTest` 슬라이스.
3. API 계약 변경 시 `frontend-admin/src/services/api.ts` 와 이 문서의 API 표를 갱신.
4. 커밋은 사용자가 요청할 때만. 요청 시 변경 단위별로 나눠 커밋하고, 제목은 기존 이력 스타일(영어 명령문 한 줄)을 따른다.

## 알려진 제약

- 로컬 JDK 는 25 이고 프로젝트 타깃은 17 이다. `pom.xml` 의 `maven.compiler.release=17` 로 컴파일은 되지만, JDK 17 설치가 가장 확실하다.
- `mobile-app/` 은 `package.json` 과 `src/` 만 있는 스캐폴딩이다. `android/`, `ios/`, `index.js` 가 없어 실제 빌드는 불가능하며 타입체크만 한다.
- `docker-compose.yml` 은 백엔드 컨테이너만 정의한다(DB 는 Supabase). 로컬 docker 미설치.
