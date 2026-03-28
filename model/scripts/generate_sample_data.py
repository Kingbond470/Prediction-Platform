"""
Script to generate sample IPL data for testing the pipeline.
This creates synthetic matches and deliveries data when Kaggle data is unavailable.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from pathlib import Path

def generate_sample_matches(n_seasons=10, start_year=2008):
    """Generate sample matches dataframe."""
    np.random.seed(42)
    random.seed(42)

    teams = ['CSK', 'MI', 'RCB', 'KKR', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'GL', 'RPS', 'KTK']
    venues = ['Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Delhi', 'Mohali', 'Jaipur', 'Hyderabad', 'Ahmedabad', 'Pune', 'Kochi']
    cities = {
        'Mumbai': 'Mumbai', 'Chennai': 'Chennai', 'Bangalore': 'Bangalore', 'Kolkata': 'Kolkata',
        'Delhi': 'Delhi', 'Mohali': 'Mohali', 'Jaipur': 'Jaipur', 'Hyderabad': 'Hyderabad',
        'Ahmedabad': 'Ahmedabad', 'Pune': 'Pune', 'Kochi': 'Kochi'
    }

    matches = []
    match_id = 1

    for season in range(start_year, start_year + n_seasons):
        # Each season has ~60 matches
        n_matches = random.randint(55, 70)
        start_date = datetime(season, 3, 15) + timedelta(days=random.randint(0, 30))

        for i in range(n_matches):
            team1, team2 = random.sample(teams, 2)
            venue = random.choice(venues)
            city = cities[venue]
            match_date = start_date + timedelta(days=i*2.5)

            winner = random.choice([team1, team2])
            result = 'normal'
            result_margin = random.choice([random.randint(1, 50), random.randint(1, 20), 0])

            toss_winner = random.choice([team1, team2])
            toss_decision = random.choice(['bat', 'field'])

            matches.append({
                'id': match_id,
                'season': season,
                'date': match_date.strftime('%Y-%m-%d'),
                'team1': team1,
                'team2': team2,
                'venue': venue,
                'city': city,
                'toss_winner': toss_winner,
                'toss_decision': toss_decision,
                'winner': winner,
                'result': result,
                'result_margin': result_margin,
                'dl_applied': 0,
                'win_by_runs': result_margin if random.random() > 0.5 else 0,
                'win_by_wickets': result_margin if random.random() <= 0.5 else 0
            })
            match_id += 1

    return pd.DataFrame(matches)


def generate_sample_deliveries(matches_df):
    """Generate sample deliveries dataframe."""
    np.random.seed(42)
    random.seed(42)

    teams = ['CSK', 'MI', 'RCB', 'KKR', 'DC', 'PBKS', 'RR', 'SRH', 'GT', 'GL', 'RPS', 'KTK']
    # Generate player names by role
    batsmen = [f'Batsman_{i}' for i in range(1, 51)]
    bowlers = [f'Bowler_{i}' for i in range(1, 51)]
    all_players = batsmen + bowlers

    deliveries = []

    for _, match in matches_df.iterrows():
        match_id = match['id']
        team1 = match['team1']
        team2 = match['team2']

        batting_first = random.choice([team1, team2])
        bowling_first = team2 if batting_first == team1 else team1

        # First innings
        total_balls_1 = random.randint(90, 120)
        wickets_fallen = 0
        for ball in range(total_balls_1):
            over = ball // 6
            ball_in_over = ball % 6 + 1

            batting_team = batting_first
            bowling_team = bowling_first

            # Random players
            batter = random.choice(batsmen)
            bowler = random.choice(bowlers)
            non_striker = random.choice([p for p in batsmen if p != batter])

            # Generate outcome
            outcome = random.choices(
                [0, 1, 2, 3, 4, 6, 'wicket', 'wide', 'noball', 'byes', 'legbyes'],
                weights=[45, 20, 8, 2, 12, 6, 4, 1, 0.5, 0.5, 0.5],
                k=1
            )[0]

            runs_off_bat = 0
            wicket = 0
            extras = 0
            wides = 0
            noballs = 0
            byes = 0
            legbyes = 0

            if outcome == 'wicket':
                wicket = 1
                wickets_fallen += 1
            elif outcome == 'wide':
                wides = 1
                extras = 1
            elif outcome == 'noball':
                noballs = 1
                extras = 1
                runs_off_bat = random.choice([0, 1])
                if runs_off_bat > 0:
                    extras += runs_off_bat
            elif outcome == 'byes':
                byes = random.choice([1, 2, 3])
                extras = byes
            elif outcome == 'legbyes':
                legbyes = random.choice([1, 2, 3])
                extras = legbyes
            else:
                runs_off_bat = outcome

            deliveries.append({
                'match_id': match_id,
                'inning': 1,
                'over': over,
                'ball': ball_in_over,
                'batting_team': batting_team,
                'bowling_team': bowling_team,
                'batter': batter,
                'bowler': bowler,
                'non_striker': non_striker,
                'runs_off_bat': runs_off_bat,
                'extras': extras,
                'wides': wides,
                'noballs': noballs,
                'byes': byes,
                'legbyes': legbyes,
                'wicket': wicket,
                'player_dismissed': batter if wicket else None,
                'dismissal_kind': random.choice(['bowled', 'caught', 'lbw', 'run out', 'stumped']) if wicket else None,
                'fielder': random.choice(bowlers + batsmen) if wicket else None
            })

        # Second innings (if not all out)
        if wickets_fallen < 10:
            total_balls_2 = random.randint(90, 120)
            for ball in range(total_balls_2):
                over = ball // 6
                ball_in_over = ball % 6 + 1

                batting_team = bowling_first
                bowling_team = batting_first

                batter = random.choice(batsmen)
                bowler = random.choice(bowlers)
                non_striker = random.choice([p for p in batsmen if p != batter])

                outcome = random.choices(
                    [0, 1, 2, 3, 4, 6, 'wicket', 'wide', 'noball', 'byes', 'legbyes'],
                    weights=[45, 20, 8, 2, 12, 6, 4, 1, 0.5, 0.5, 0.5],
                    k=1
                )[0]

                runs_off_bat = 0
                wicket = 0
                extras = 0
                wides = 0
                noballs = 0
                byes = 0
                legbyes = 0

                if outcome == 'wicket':
                    wicket = 1
                elif outcome == 'wide':
                    wides = 1
                    extras = 1
                elif outcome == 'noball':
                    noballs = 1
                    extras = 1
                    runs_off_bat = random.choice([0, 1])
                    if runs_off_bat > 0:
                        extras += runs_off_bat
                elif outcome == 'byes':
                    byes = random.choice([1, 2, 3])
                    extras = byes
                elif outcome == 'legbyes':
                    legbyes = random.choice([1, 2, 3])
                    extras = legbyes
                else:
                    runs_off_bat = outcome

                deliveries.append({
                    'match_id': match_id,
                    'inning': 2,
                    'over': over,
                    'ball': ball_in_over,
                    'batting_team': batting_team,
                    'bowling_team': bowling_team,
                    'batter': batter,
                    'bowler': bowler,
                    'non_striker': non_striker,
                    'runs_off_bat': runs_off_bat,
                    'extras': extras,
                    'wides': wides,
                    'noballs': noballs,
                    'byes': byes,
                    'legbyes': legbyes,
                    'wicket': wicket,
                    'player_dismissed': batter if wicket else None,
                    'dismissal_kind': random.choice(['bowled', 'caught', 'lbw', 'run out', 'stumped']) if wicket else None,
                    'fielder': random.choice(bowlers + batsmen) if wicket else None
                })

    return pd.DataFrame(deliveries)


def main():
    """Generate and save sample data."""
    data_dir = Path('data/raw')
    data_dir.mkdir(parents=True, exist_ok=True)

    print("Generating sample matches data...")
    matches_df = generate_sample_matches(n_seasons=10, start_year=2008)
    matches_path = data_dir / 'matches.csv'
    matches_df.to_csv(matches_path, index=False)
    print(f"[OK] Saved {len(matches_df)} matches to {matches_path}")

    print("\nGenerating sample deliveries data...")
    deliveries_df = generate_sample_deliveries(matches_df)
    deliveries_path = data_dir / 'deliveries.csv'
    deliveries_df.to_csv(deliveries_path, index=False)
    print(f"[OK] Saved {len(deliveries_df)} deliveries to {deliveries_path}")

    print("\n" + "="*60)
    print("Sample data generation complete!")
    print("="*60)
    print(f"Matches: {len(matches_df)} rows, {len(matches_df.columns)} columns")
    print(f"Deliveries: {len(deliveries_df)} rows, {len(deliveries_df.columns)} columns")
    print("\nYou can now run the pipeline:")
    print("  python scripts/run_pipeline.py --phase all")


if __name__ == '__main__':
    main()
