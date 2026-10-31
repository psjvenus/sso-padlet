# sso's padlet

Next.js 16.2.9, React 19, TypeScript, Tailwind CSS, Supabase 기반의 메모 보드입니다. 기존 화면과 메모 작성·조회·검색·삭제, 공유, 관리자 개별/전체 삭제를 유지합니다. 메모 수정, 회원 가입, 첨부파일/Storage 기능은 원본에 없으며 이번 작업에도 추가하지 않았습니다.

## 강의 중 설정 순서

명령은 `package.json`이 있는 **`C:\padlet\padlet`** 폴더에서 실행합니다. Node.js 22 LTS 이상과 npm을 사용하세요.

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 아래 기준으로 SQL을 선택하여 내용을 확인한 뒤 직접 **Run**을 누릅니다.
   - **새 DB:** 루트의 `schema.sql`을 실행합니다.
   - **기존 `memos` 테이블이 있는 DB:** 기존 열이 `id`, `title`, `content`, `password_hash`, `created_at`인지, RLS가 켜져 있는지 확인합니다. 이전 `schema.sql`을 적용한 DB라면 `migrations/001_protect_password_hash.sql`만 실행합니다. 이미 같은 권한을 적용했다면 다시 실행할 필요가 없습니다.
   - 두 파일 모두 테이블/데이터를 삭제하지 않습니다. `schema.sql` 재실행은 같은 이름의 읽기/작성 정책을 다시 만들며, 권한을 조정합니다. 기존 스키마가 다르거나 별도 정책이 있다면 먼저 비교하세요. `CREATE TABLE IF NOT EXISTS`는 기존 열을 수정하지 않습니다.
3. Supabase 프로젝트 URL과 **Legacy API Keys**의 `anon`, `service_role` 키를 확인합니다. 기존 Legacy 방식을 그대로 사용합니다.
4. 준비된 `.env.local`의 아래 다섯 항목을 채웁니다. 값은 비어 있으며 `.env.local.example`은 수정하지 않았습니다.

| 변수 | 입력할 값 | 사용 위치 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | 브라우저/서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy `anon` 키 | 브라우저/서버 |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy `service_role` 키 | 서버만 |
| `ADMIN_PASSWORD` | 직접 정한 충분히 긴 관리자 비밀번호, 평문 | 서버만 |
| `ADMIN_SESSION_SECRET` | 관리자 비밀번호와 다른 무작위 비밀 문자열 | 서버만 |

5. 세션 비밀값은 직접 생성해 `.env.local`에 입력합니다. 아래 명령은 사용자가 실행할 때만 값을 생성합니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

6. 처음 설치한다면 `npm ci`를 실행한 뒤 `npm run dev`로 시작합니다. 환경변수를 바꿨다면 실행 중인 서버를 `Ctrl+C`로 완전히 종료하고 다시 실행합니다. `http://localhost:3000`을 엽니다.
7. 메모 작성·조회·검색·4자리 비밀번호 삭제, 잘못된 비밀번호 거부, 관리자 로그인·로그아웃·개별 삭제를 직접 확인합니다. 전체 삭제는 별도 테스트 DB의 테스트 메모에서만 확인하세요. 원래 수정 기능이 없으므로 수정 검사는 해당하지 않습니다.
8. GitHub 저장소를 직접 만들고 소스를 업로드합니다. `.env.local`, `node_modules`, `.next`, `.vercel`은 업로드하지 않습니다. 기존 Git 원격 주소와 이력은 변경하지 않았습니다.
9. Vercel에서 GitHub 저장소를 연결합니다. Framework는 **Next.js**, Build Command는 **`npm run build`**, Output Directory는 기본값을 사용합니다. 저장소 루트에 이 프로젝트를 올렸다면 Root Directory는 기본값이고, 상위 폴더째 올렸다면 `package.json`이 있는 `padlet` 폴더를 지정합니다.
10. Vercel의 Environment Variables에 위 **다섯 변수**를 별도로 등록하고 배포합니다. 로컬 `.env.local`은 자동으로 전달되지 않습니다. Production 및 사용할 Preview 환경을 지정하세요. 공개 변수는 빌드에 포함되므로 값을 변경한 뒤 재배포해야 합니다. 배포 주소에서 7번 검사를 반복합니다.

## 로컬 검사

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

프로덕션을 로컬에서 확인하려면 `npm run build` 후 `npm start`를 실행합니다. Windows PowerShell에서 실행 정책으로 npm이 차단되면 `npm.cmd`를 사용합니다.

실제 환경변수가 없어도 정적 검사와 빌드는 가능합니다. 빈 설정으로 만든 빌드는 Supabase 서비스를 사용할 수 없으므로, 값을 입력한 후 다시 빌드하세요. `.env.local`이 있는데도 값이 반영되지 않으면 작업 폴더와 변수 이름을 확인하고 서버를 재시작하세요. Next.js는 실행 프로세스의 환경변수 → `.env.development.local`(개발)/`.env.production.local`(운영) → `.env.local` → 해당 환경의 `.env` → `.env` 순서로 먼저 발견한 값을 사용합니다.

## 보안과 SQL

- 공개 클라이언트는 Legacy `anon` 키로 `id,title,content,created_at` 열만 조회합니다. 비밀번호 해시 열은 공개 읽기 권한에서 제외했습니다. 전체 열을 읽는 `select('*')`는 사용하지 마세요. [Supabase 열별 권한 문서](https://supabase.com/docs/guides/database/postgres/column-level-security)를 참고했습니다.
- 작성 API는 기존대로 서버에서 bcrypt 해시를 만든 뒤 `anon` 권한과 RLS 작성 정책으로 저장합니다. 일반 삭제 API는 서버 전용 `service_role`로 해시를 읽고 4자리 비밀번호를 검증합니다.
- 관리자 비밀번호는 `ADMIN_PASSWORD`와 서버에서 비교합니다. `ADMIN_SESSION_SECRET`으로 서명한 세션은 서버에서도 8시간 만료를 확인합니다. 쿠키는 `HttpOnly`, `SameSite=Strict`, 운영 환경에서 `Secure`를 사용합니다. 이번 변경 전 세션은 다시 로그인해야 합니다.
- `service_role` 모듈에 서버 전용 경계를 추가했습니다. 비밀 키·관리자 비밀번호·세션 비밀값에는 `NEXT_PUBLIC_`를 붙이지 마세요.
- 기존 코드에는 로그인/삭제 비밀번호 시도 횟수 제한이 없습니다. 공개 운영 시에는 Vercel Firewall 등 배포 계층에서 관련 API의 요청 제한을 별도로 설정하세요. 서버 인스턴스마다 초기화되는 메모리 제한은 추가하지 않았습니다.
- `.gitignore`는 `.env*`를 제외하고 `.env.local.example`만 허용합니다. 예시 파일에 포함된 비밀번호 예시는 실제 설정에 복사하지 마세요. 실제 비밀 파일은 Git 추적 대상에 없습니다.

## 이번 작업의 검증 범위

환경변수 없이 ESLint, TypeScript, 프로덕션 빌드, 개발 서버와 HTTP 응답을 검사했습니다. 세션 단위 테스트는 정상 인증, 토큰 변조, 8시간 만료, 구형 토큰 거부, 비밀값 변경/누락을 확인합니다. 실제 Supabase 연결·SQL 실행·메모 저장/삭제·실제 관리자 비밀번호 로그인·GitHub 업로드·Vercel 배포는 수행하지 않았습니다. 이 항목들은 위 설정을 마친 후 확인해야 합니다.
