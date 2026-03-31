import re
from pathlib import Path

QUESTIONS_DIR = Path(__file__).parent / "questions"


def load_questions(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")

    blocks = re.split(r"^(##!?)\s*$", text, flags=re.MULTILINE)

    questions = []
    i = 1
    while i < len(blocks) - 1:
        marker = blocks[i].strip()
        body = blocks[i + 1]
        i += 2

        if marker == "##!":
            continue

        lines = [l.strip() for l in body.strip().splitlines() if l.strip()]
        if not lines:
            continue

        question_text = lines[0]
        options = []
        answer = -1
        explanation_lines = []

        for line in lines[1:]:
            if line.startswith("* "):
                answer = len(options)
                options.append(line[2:])
            elif line.startswith("- "):
                options.append(line[2:])
            elif line.startswith("> "):
                explanation_lines.append(line[2:])

        if options and answer >= 0:
            questions.append({
                "id": len(questions) + 1,
                "question": question_text,
                "options": options,
                "answer": answer,
                "explanation": " ".join(explanation_lines) if explanation_lines else "",
            })

    return questions


def get_available_rounds() -> list[dict]:
    rounds = []
    for f in sorted(QUESTIONS_DIR.glob("*.md")):
        num = f.stem
        if num.isdigit():
            qs = load_questions(f)
            rounds.append({
                "round": int(num),
                "filename": f.name,
                "question_count": len(qs),
            })
    return rounds


def get_questions_for_round(round_num: int) -> list[dict]:
    path = QUESTIONS_DIR / f"{round_num}.md"
    if not path.exists():
        return []
    return load_questions(path)
