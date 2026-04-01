import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from questions import load_questions, parse_questions_md, QUESTIONS_DIR

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DB_PATH = BASE_DIR / "data" / "quiz.db"


def static_file(name: str) -> FileResponse:
    return FileResponse(STATIC_DIR / name)


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                round INTEGER NOT NULL,
                name TEXT NOT NULL,
                ip TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                submitted_at TEXT NOT NULL,
                details TEXT DEFAULT ''
            )
        """)
        try:
            conn.execute("ALTER TABLE results ADD COLUMN details TEXT DEFAULT ''")
        except Exception:
            pass
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rounds (
                round INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                round INTEGER NOT NULL,
                sort_order INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                options TEXT NOT NULL,
                answer_index INTEGER NOT NULL,
                explanation TEXT DEFAULT '',
                FOREIGN KEY (round) REFERENCES rounds(round) ON DELETE CASCADE
            )
        """)


def seed_from_md():
    """questions/ 디렉토리의 .md 파일을 DB에 시딩 (DB가 비어있을 때만)"""
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM rounds").fetchone()[0]
        if count > 0:
            return

        for f in sorted(QUESTIONS_DIR.glob("*.md")):
            num = f.stem
            if not num.isdigit():
                continue
            round_num = int(num)
            qs = load_questions(f)
            if not qs:
                continue

            title_line = f.read_text(encoding="utf-8").strip().splitlines()[0]
            title = title_line.lstrip("# ").strip() if title_line.startswith("#") else f"{round_num}회차 퀴즈"

            conn.execute(
                "INSERT INTO rounds (round, title, created_at) VALUES (?, ?, ?)",
                (round_num, title, datetime.now().isoformat()),
            )
            for q in qs:
                conn.execute(
                    "INSERT INTO questions (round, sort_order, question_text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?)",
                    (round_num, q["id"], q["question"], json.dumps(q["options"], ensure_ascii=False), q["answer"], q["explanation"]),
                )


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# --- DB 헬퍼 ---

def db_get_rounds():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT r.round, r.title, COUNT(q.id) as question_count
            FROM rounds r LEFT JOIN questions q ON r.round = q.round
            GROUP BY r.round ORDER BY r.round
        """).fetchall()
    return [{"round": r["round"], "title": r["title"], "question_count": r["question_count"]} for r in rows]


def db_get_questions(round_num: int) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM questions WHERE round = ? ORDER BY sort_order",
            (round_num,),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "question": r["question_text"],
            "options": json.loads(r["options"]),
            "answer": r["answer_index"],
            "explanation": r["explanation"] or "",
        }
        for r in rows
    ]


# --- Pydantic 모델 ---

class QuizSubmission(BaseModel):
    name: str
    round: int
    answers: list[int]

class RoundCreate(BaseModel):
    round: int
    title: str

class RoundUpdate(BaseModel):
    title: str

class MarkdownImport(BaseModel):
    markdown: str

class NameUpdate(BaseModel):
    name: str


# --- 앱 시작 ---

@app.on_event("startup")
def startup():
    init_db()
    seed_from_md()


# --- 페이지 라우트 ---

@app.get("/")
async def index():
    return static_file("index.html")

@app.get("/result")
async def page_result():
    return static_file("result.html")

@app.get("/admin/question")
async def page_question():
    return static_file("admin/question.html")

@app.get("/admin/hidden")
async def page_hidden():
    return static_file("admin/hidden.html")


# --- 퀴즈 공개 API ---

@app.get("/api/rounds")
async def get_rounds():
    rounds = db_get_rounds()
    return [{"round": r["round"], "title": r["title"], "question_count": r["question_count"]} for r in rounds]

@app.get("/api/questions/{round_num}")
async def get_questions(round_num: int):
    questions = db_get_questions(round_num)
    return [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in questions]

@app.post("/api/submit")
async def submit_quiz(submission: QuizSubmission, request: Request):
    xff = request.headers.get("x-forwarded-for", "")
    client_ip = xff.split(",")[0].strip() if xff else request.headers.get("x-real-ip", request.client.host)
    questions = db_get_questions(submission.round)

    score = 0
    details = []
    for i, q in enumerate(questions):
        chosen = submission.answers[i] if i < len(submission.answers) else -1
        correct = chosen == q["answer"]
        if correct:
            score += 1
        details.append({
            "question_id": q["id"],
            "chosen": chosen,
            "correct_answer": q["answer"],
            "is_correct": correct,
        })

    now = datetime.now().isoformat()
    details_json = json.dumps(details, ensure_ascii=False)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO results (round, name, ip, score, total, submitted_at, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (submission.round, submission.name, client_ip, score, len(questions), now, details_json),
        )

    return {
        "name": submission.name,
        "round": submission.round,
        "score": score,
        "total": len(questions),
        "details": details,
        "questions": questions,
    }

@app.get("/api/results")
async def get_results(round: int = 0):
    with get_db() as conn:
        if round > 0:
            rows = conn.execute(
                "SELECT * FROM results WHERE round = ? ORDER BY score DESC, submitted_at ASC",
                (round,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM results ORDER BY round ASC, score DESC, submitted_at ASC"
            ).fetchall()

    results = []
    for r in rows:
        results.append({
            "id": r["id"], "round": r["round"], "name": r["name"],
            "ip": r["ip"], "score": r["score"], "total": r["total"],
            "submitted_at": r["submitted_at"],
        })
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results

@app.delete("/api/results")
async def clear_results():
    with get_db() as conn:
        conn.execute("DELETE FROM results")
    return {"message": "결과가 초기화되었습니다."}

@app.delete("/api/results/{result_id}")
async def delete_result(result_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM results WHERE id = ?", (result_id,))
    return {"message": "삭제되었습니다."}

@app.patch("/api/results/{result_id}")
async def update_result_name(result_id: int, body: NameUpdate):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "이름을 입력하세요.")
    with get_db() as conn:
        conn.execute("UPDATE results SET name = ? WHERE id = ?", (name, result_id))
    return {"message": "수정되었습니다."}

@app.get("/api/results/{result_id}/details")
async def get_result_details(result_id: int):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM results WHERE id = ?", (result_id,)).fetchone()
    if not row:
        raise HTTPException(404, "결과를 찾을 수 없습니다.")
    details_raw = row["details"] if row["details"] else "[]"
    details = json.loads(details_raw)
    questions = db_get_questions(row["round"])
    return {"result": {"id": row["id"], "round": row["round"], "name": row["name"], "score": row["score"], "total": row["total"]}, "details": details, "questions": questions}


# --- 관리자 회차 CRUD ---

@app.get("/api/admin/rounds")
async def admin_list_rounds():
    return db_get_rounds()

@app.post("/api/admin/rounds")
async def admin_create_round(body: RoundCreate):
    with get_db() as conn:
        existing = conn.execute("SELECT round FROM rounds WHERE round = ?", (body.round,)).fetchone()
        if existing:
            raise HTTPException(400, f"{body.round}회차가 이미 존재합니다.")
        conn.execute(
            "INSERT INTO rounds (round, title, created_at) VALUES (?, ?, ?)",
            (body.round, body.title, datetime.now().isoformat()),
        )
    return {"message": f"{body.round}회차가 생성되었습니다."}

@app.put("/api/admin/rounds/{round_num}")
async def admin_update_round(round_num: int, body: RoundUpdate):
    with get_db() as conn:
        conn.execute("UPDATE rounds SET title = ? WHERE round = ?", (body.title, round_num))
    return {"message": "회차가 수정되었습니다."}

@app.delete("/api/admin/rounds/{round_num}")
async def admin_delete_round(round_num: int):
    with get_db() as conn:
        conn.execute("DELETE FROM rounds WHERE round = ?", (round_num,))
    return {"message": f"{round_num}회차가 삭제되었습니다."}


# --- 관리자 문제 마크다운 편집 ---

@app.get("/api/admin/rounds/{round_num}/markdown")
async def admin_get_markdown(round_num: int):
    """DB에 저장된 문제를 마크다운 형식으로 반환"""
    questions = db_get_questions(round_num)
    lines = []
    for q in questions:
        lines.append("##")
        lines.append(q["question"])
        for i, opt in enumerate(q["options"]):
            prefix = "*" if i == q["answer"] else "-"
            lines.append(f"{prefix} {opt}")
        if q["explanation"]:
            lines.append(f"> {q['explanation']}")
        lines.append("")
    return {"markdown": "\n".join(lines)}


@app.put("/api/admin/rounds/{round_num}/markdown")
async def admin_save_markdown(round_num: int, body: MarkdownImport):
    """마크다운을 파싱하여 해당 회차의 문제를 전부 교체"""
    parsed = parse_questions_md(body.markdown)
    if not parsed:
        raise HTTPException(400, "파싱된 문제가 없습니다. 마크다운 형식을 확인하세요.")

    with get_db() as conn:
        existing = conn.execute("SELECT round FROM rounds WHERE round = ?", (round_num,)).fetchone()
        if not existing:
            raise HTTPException(404, f"{round_num}회차가 존재하지 않습니다.")

        conn.execute("DELETE FROM questions WHERE round = ?", (round_num,))
        for q in parsed:
            conn.execute(
                "INSERT INTO questions (round, sort_order, question_text, options, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?)",
                (round_num, q["id"], q["question"], json.dumps(q["options"], ensure_ascii=False), q["answer"], q["explanation"]),
            )

    return {"message": f"{len(parsed)}개 문제가 저장되었습니다.", "count": len(parsed)}


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
