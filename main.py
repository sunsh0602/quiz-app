import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from questions import get_available_rounds, get_questions_for_round

app = FastAPI()

DB_PATH = Path(__file__).parent / "data" / "quiz.db"


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                round INTEGER NOT NULL,
                name TEXT NOT NULL,
                ip TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                submitted_at TEXT NOT NULL
            )
        """)


@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


class QuizSubmission(BaseModel):
    name: str
    round: int
    answers: list[int]


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.get("/admin")
async def admin():
    return FileResponse("static/admin.html")


@app.get("/admin-hidden")
async def admin_hidden():
    return FileResponse("static/admin-hidden.html")


@app.get("/api/rounds")
async def get_rounds():
    return get_available_rounds()


@app.get("/api/questions/{round_num}")
async def get_questions(round_num: int):
    questions = get_questions_for_round(round_num)
    return [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]


@app.post("/api/submit")
async def submit_quiz(submission: QuizSubmission, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host)
    questions = get_questions_for_round(submission.round)

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
    with get_db() as conn:
        conn.execute(
            "INSERT INTO results (round, name, ip, score, total, submitted_at) VALUES (?, ?, ?, ?, ?, ?)",
            (submission.round, submission.name, client_ip, score, len(questions), now),
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
            "id": r["id"],
            "round": r["round"],
            "name": r["name"],
            "ip": r["ip"],
            "score": r["score"],
            "total": r["total"],
            "submitted_at": r["submitted_at"],
        })

    rank = 0
    for i, r in enumerate(results):
        rank = i + 1
        r["rank"] = rank

    return results


@app.delete("/api/results")
async def clear_results():
    with get_db() as conn:
        conn.execute("DELETE FROM results")
    return {"message": "결과가 초기화되었습니다."}


app.mount("/static", StaticFiles(directory="static"), name="static")
