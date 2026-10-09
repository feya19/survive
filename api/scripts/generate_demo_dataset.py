import argparse
import random
import pandas as pd


def generate(path: str, rows: int = 100, seed: int = 42):
    random.seed(seed)
    data = []
    for _ in range(rows):
        budget = random.randint(100_000, 10_000_000)
        marketing = random.randint(10_000, 2_000_000)
        days = random.randint(10, 100)
        genre = random.choice(["Drama", "Comedy", "Action"])
        revenue = 1.4 * budget + 2.1 * marketing + 8000 * days + random.gauss(0, 200_000)
        data.append({"Film Category": genre, "Production Cost": budget, "Marketing Spend": marketing, "Production Days": days, "Box Office Income": round(revenue, 2)})
    frame = pd.DataFrame(data)
    if path.lower().endswith(".xlsx"):
        frame.to_excel(path, index=False)
    else:
        frame.to_csv(path, index=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    parser.add_argument("--rows", type=int, default=100)
    args = parser.parse_args()
    generate(args.path, args.rows)
